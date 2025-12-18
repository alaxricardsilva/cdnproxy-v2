package middleware

// ContextKey é um tipo de chave de contexto para evitar colisões.
type ContextKey string

const UserIDKey ContextKey = "userID"
const RoleKey ContextKey = "role"
