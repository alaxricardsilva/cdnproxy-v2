package models

import "github.com/golang-jwt/jwt/v4"

// Claims define a estrutura do payload do token JWT.
type Claims struct {
	UserID int64  `json:"user_id"`
	Role   string `json:"role"`
	jwt.RegisteredClaims
}
