package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"recipe-planner-go/internal/httpx"
)

const maxImageUploadSize = 8 << 20

func (h Handler) UploadImage(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, maxImageUploadSize)
	if err := r.ParseMultipartForm(maxImageUploadSize); err != nil {
		httpx.Error(w, http.StatusBadRequest, "Image must be smaller than 8MB")
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "file is required")
		return
	}
	defer file.Close()

	ext := strings.ToLower(filepath.Ext(header.Filename))
	if ext == "" {
		ext = ".jpg"
	}
	if ext != ".jpg" && ext != ".jpeg" && ext != ".png" && ext != ".webp" {
		httpx.Error(w, http.StatusBadRequest, "only jpg, png, and webp are supported")
		return
	}

	if err := os.MkdirAll("uploads/recipes", 0755); err != nil {
		httpx.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	name, err := randomName(ext)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	path := filepath.Join("uploads", "recipes", name)
	dst, err := os.Create(path)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	defer dst.Close()
	if _, err := io.Copy(dst, file); err != nil {
		httpx.Error(w, http.StatusInternalServerError, err.Error())
		return
	}

	url := publicBaseURL(r) + "/uploads/recipes/" + name
	httpx.JSON(w, http.StatusCreated, map[string]string{"url": url})
}

func randomName(ext string) (string, error) {
	buf := make([]byte, 16)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return hex.EncodeToString(buf) + ext, nil
}

func publicBaseURL(r *http.Request) string {
	proto := r.Header.Get("X-Forwarded-Proto")
	if proto == "" {
		proto = "http"
	}
	host := r.Host
	return proto + "://" + host
}
