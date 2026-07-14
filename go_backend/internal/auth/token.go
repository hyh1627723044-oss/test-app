package auth

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"strconv"
	"strings"
	"time"
)

type Claims struct {
	Subject   string `json:"sub"`
	ExpiresAt int64  `json:"exp"`
}

func CreateToken(userID int64, secret string, ttl time.Duration) (string, error) {
	claims := Claims{Subject: strconv.FormatInt(userID, 10), ExpiresAt: time.Now().Add(ttl).Unix()}
	payload, err := json.Marshal(claims)
	if err != nil {
		return "", err
	}
	body := base64.RawURLEncoding.EncodeToString(payload)
	return body + "." + sign(body, secret), nil
}

func ParseToken(token string, secret string) (int64, error) {
	body, sig, ok := strings.Cut(token, ".")
	if !ok || !hmac.Equal([]byte(sig), []byte(sign(body, secret))) {
		return 0, errors.New("invalid token")
	}
	raw, err := base64.RawURLEncoding.DecodeString(body)
	if err != nil {
		return 0, err
	}
	var claims Claims
	if err := json.Unmarshal(raw, &claims); err != nil {
		return 0, err
	}
	if claims.ExpiresAt < time.Now().Unix() {
		return 0, errors.New("token expired")
	}
	return strconv.ParseInt(claims.Subject, 10, 64)
}

func sign(body string, secret string) string {
	mac := hmac.New(sha256.New, []byte(secret))
	_, _ = mac.Write([]byte(body))
	return base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
}
