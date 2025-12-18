package middleware

import (
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
)

// Mock JWT válido (gere um token real do Supabase para teste)
const validJWT = "Bearer <SUPERADMIN_JWT_AQUI>"
const adminJWT = "Bearer <ADMIN_JWT_AQUI>"

// Mock JWKS URL (endpoint público do seu projeto Supabase)
const jwksURL = "https://<YOUR_PROJECT_ID>.supabase.co/auth/v1/keys"

func TestSupabaseAuthMiddlewareSuperadmin(t *testing.T) {
	os.Setenv("SUPABASE_JWT_SIGNING_KEY", jwksURL)

	protectedHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("Acesso autorizado SUPERADMIN"))
	})

	handlerToTest := SupabaseAuth(protectedHandler)

	req := httptest.NewRequest("GET", "/api/protected", nil)
	req.Header.Set("Authorization", validJWT)

	rr := httptest.NewRecorder()
	handlerToTest.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("Esperado status 200 para SUPERADMIN, recebeu %d, body: %s", rr.Code, rr.Body.String())
	}
}

func TestSupabaseAuthMiddlewareAdmin(t *testing.T) {
	os.Setenv("SUPABASE_JWT_SIGNING_KEY", jwksURL)

	protectedHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("Acesso autorizado ADMIN"))
	})

	handlerToTest := SupabaseAuth(protectedHandler)

	req := httptest.NewRequest("GET", "/api/protected", nil)
	req.Header.Set("Authorization", adminJWT)

	rr := httptest.NewRecorder()
	handlerToTest.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("Esperado status 200 para ADMIN, recebeu %d, body: %s", rr.Code, rr.Body.String())
	}
}

func TestSupabaseAuthMiddlewareInvalidToken(t *testing.T) {
	os.Setenv("SUPABASE_JWT_SIGNING_KEY", jwksURL)

	protectedHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	handlerToTest := SupabaseAuth(protectedHandler)

	req := httptest.NewRequest("GET", "/api/protected", nil)
	req.Header.Set("Authorization", "Bearer token_invalido")

	rr := httptest.NewRecorder()
	handlerToTest.ServeHTTP(rr, req)

	if rr.Code == http.StatusOK {
		t.Errorf("Esperado erro de autenticação, recebeu status 200")
	}
}
