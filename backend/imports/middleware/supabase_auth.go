package middleware

import (
	"CDNProxy_v2/backend/config"
	"context"
	"fmt"
	"net/http"
	"strings"

	"github.com/golang-jwt/jwt/v5"
)

// CustomClaims define a estrutura para as claims personalizadas do JWT.
type CustomClaims struct {
	Role string `json:"role"`
	jwt.RegisteredClaims
}

// SupabaseAuth é o middleware para validar o token JWT do Supabase.
func SupabaseAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		cfg, err := config.LoadConfig()
		if err != nil {
			http.Error(w, "Erro ao carregar configuração", http.StatusInternalServerError)
			return
		}

		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			http.Error(w, "Cabeçalho de autorização ausente", http.StatusUnauthorized)
			return
		}

		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			http.Error(w, "Formato do cabeçalho de autorização inválido", http.StatusUnauthorized)
			return
		}

		tokenString := parts[1]

		token, err := jwt.ParseWithClaims(tokenString, &CustomClaims{}, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("método de assinatura inesperado: %v", token.Header["alg"])
			}
			return []byte(cfg.SupabaseJwtSigningKey), nil
		})

		if err != nil {
			http.Error(w, fmt.Sprintf("Token inválido: %v", err), http.StatusUnauthorized)
			return
		}

		if claims, ok := token.Claims.(*CustomClaims); ok && token.Valid {
			ctx := context.WithValue(r.Context(), "userRole", claims.Role)
			ctx = context.WithValue(ctx, "userID", claims.Subject)
			next.ServeHTTP(w, r.WithContext(ctx))
		} else {
			http.Error(w, "Claims do token inválidas", http.StatusUnauthorized)
		}
	})
}

// RoleBasedAuth é um middleware para verificar a role do usuário.
func RoleBasedAuth(allowedRoles ...string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			userRole, ok := r.Context().Value("userRole").(string)
			if !ok {
				http.Error(w, "Role do usuário não encontrada no contexto", http.StatusForbidden)
				return
			}

			for _, role := range allowedRoles {
				if userRole == role {
					next.ServeHTTP(w, r)
					return
				}
			}

			http.Error(w, "Acesso negado. Você não tem permissão para acessar este recurso.", http.StatusForbidden)
		})
	}
}
