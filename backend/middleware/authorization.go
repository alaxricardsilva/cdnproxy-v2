package middleware

import (
	"net/http"
)

// RoleAuthorization é um middleware que verifica se a role do usuário, presente no token JWT,
// corresponde à role necessária para acessar a rota.
func RoleAuthorization(requiredRole string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Obtém a role do usuário do contexto (injetada pelo middleware JwtAuthentication)
			role, ok := r.Context().Value(RoleKey).(string)
			if !ok {
				http.Error(w, "Role not found in context", http.StatusInternalServerError)
				return
			}

			// Verifica se a role do usuário corresponde à role necessária
			// Se o usuário for Super Admin (1), permite o acesso irrestrito
			if role != requiredRole && role != "1" {
				http.Error(w, "Forbidden: You don't have the required permissions", http.StatusForbidden)
				return
			}

			// Se a role for válida, prossegue para o próximo handler
			next.ServeHTTP(w, r)
		})
	}
}
