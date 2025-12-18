package middleware

import (
	"context"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"

	"CDNProxy_v2/backend/database"

	"github.com/lestrrat-go/jwx/v3/jwk"
	jwxjwt "github.com/lestrrat-go/jwx/v3/jwt"
)

func SupabaseAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			http.Error(w, "Authorization header required", http.StatusUnauthorized)
			return
		}

		tokenString := strings.TrimPrefix(authHeader, "Bearer ")
		if tokenString == authHeader {
			http.Error(w, "Could not find Bearer token in Authorization header", http.StatusUnauthorized)
			return
		}

		log.Printf("DEBUG: Received token string: %s", tokenString)

		jwksURL := os.Getenv("SUPABASE_JWT_SIGNING_KEY")
		if jwksURL == "" {
			http.Error(w, "Supabase JWKS URL not configured", http.StatusInternalServerError)
			return
		}

		keySet, err := jwk.Fetch(r.Context(), jwksURL)
		if err != nil {
			log.Printf("ERROR: Failed to fetch JWKS: %v", err)
			http.Error(w, "Failed to fetch JWKS", http.StatusInternalServerError)
			return
		}

		token, err := jwxjwt.ParseString(
			tokenString,
			jwxjwt.WithKeySet(keySet),
			jwxjwt.WithValidate(true),
			jwxjwt.WithContext(r.Context()),
		)
		if err != nil {
			log.Printf("ERROR: Token validation failed: %v", err)
			http.Error(w, "Invalid token: "+err.Error(), http.StatusUnauthorized)
			return
		}

		subject, ok := token.Subject()
		if !ok || subject == "" {
			http.Error(w, "Subject claim not found", http.StatusUnauthorized)
			return
		}

		log.Printf("DEBUG: Extracted subject: %s", subject)

		var (
			userID      int64
			userRoleInt int
		)

		query := "SELECT id, role FROM public.users WHERE supabase_auth_id = $1"
		err = database.DB.QueryRow(
			r.Context(),
			query,
			subject,
		).Scan(&userID, &userRoleInt)

		if err != nil {
			log.Printf("ERROR: Database query failed. Query: '%s', Subject: '%s', Error: %v", query, subject, err)
			http.Error(w, "User not found or database error", http.StatusForbidden)
			return
		}

		userRole := strconv.Itoa(userRoleInt)

		log.Printf("DEBUG: Found user role '%s' for subject '%s'", userRole, subject)

		ctx := context.WithValue(r.Context(), UserIDKey, userID)
		ctx = context.WithValue(ctx, RoleKey, userRole)

		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func CORSMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")

		allowedOrigins := []string{
			os.Getenv("FRONTEND_URL"),
			"https://app.cdnproxy.top",
			"https://cdnproxy.top",
			"http://localhost:3030",
			"http://127.0.0.1:3030",
			"http://102.216.82.183:3030",
		}

		isAllowedOrigin := origin == ""
		if origin != "" {
			for _, o := range allowedOrigins {
				if o != "" && o == origin {
					isAllowedOrigin = true
					break
				}
			}

			if !isAllowedOrigin {
				if strings.HasPrefix(origin, "http://localhost:") || strings.HasPrefix(origin, "http://127.0.0.1:") {
					isAllowedOrigin = true
				}
				// Allow specific domains like Vercel
				if strings.HasSuffix(origin, ".vercel.app") {
					isAllowedOrigin = true
				}
			}
		}

		if isAllowedOrigin {
			if origin != "" {
				w.Header().Set("Access-Control-Allow-Origin", origin)
			} else {
				w.Header().Set("Access-Control-Allow-Origin", "*")
			}
		} else {
			w.Header().Set("Access-Control-Allow-Origin", "null")
		}

		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, Accept, Origin, Cache-Control")
		w.Header().Set("Access-Control-Allow-Credentials", "true")
		w.Header().Set("Vary", "Origin")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		next.ServeHTTP(w, r)
	})
}
