package service

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"time"

	"recipe-planner-go/internal/config"
)

type AIClient struct {
	Config config.Config
	HTTP   *http.Client
}

type chatRequest struct {
	Model    string        `json:"model"`
	Messages []chatMessage `json:"messages"`
	Stream   bool          `json:"stream"`
}

type chatMessage struct {
	Role    string `json:"role"`
	Content any    `json:"content"`
}

type chatResponse struct {
	Choices []struct {
		Message struct {
			Content string `json:"content"`
		} `json:"message"`
	} `json:"choices"`
}

func NewAIClient(cfg config.Config) AIClient {
	return AIClient{Config: cfg, HTTP: &http.Client{Timeout: 60 * time.Second}}
}

func (c AIClient) RecommendToday(ctx context.Context, message string, candidates []map[string]any) (string, []int64, error) {
	if c.Config.MaasAPIKey == "" {
		return "AI key is not configured on the server.", nil, nil
	}
	rawCandidates, _ := json.Marshal(candidates)
	prompt := "你是一个家常菜谱助手。根据用户需求和候选菜谱推荐今天吃什么。回答要自然、短一些，并在最后追加 JSON：{\"recipe_ids\":[1,2]}。候选菜谱：" + string(rawCandidates)
	content, err := c.chat(ctx, c.Config.MaasTextModel, []chatMessage{
		{Role: "system", Content: prompt},
		{Role: "user", Content: message},
	})
	if err != nil {
		return "", nil, err
	}
	return content, extractRecipeIDs(content), nil
}

func (c AIClient) RecognizeRecipe(ctx context.Context, imageURL string) (map[string]any, error) {
	if c.Config.MaasAPIKey == "" {
		return map[string]any{"title": "", "description": "", "ingredients": []string{}, "cook_time_minutes": 0}, nil
	}
	content := []map[string]any{
		{"type": "text", "text": "识别图片里的菜品，返回 JSON：title, description, ingredients, cook_time_minutes。不要输出多余文字。"},
		{"type": "image_url", "image_url": map[string]string{"url": imageURL}},
	}
	reply, err := c.chat(ctx, c.Config.MaasVisionModel, []chatMessage{{Role: "user", Content: content}})
	if err != nil {
		return nil, err
	}
	var result map[string]any
	if err := json.Unmarshal([]byte(sliceJSON(reply)), &result); err != nil {
		return map[string]any{"title": "", "description": reply, "ingredients": []string{}, "cook_time_minutes": 0}, nil
	}
	return result, nil
}

func (c AIClient) chat(ctx context.Context, model string, messages []chatMessage) (string, error) {
	body, _ := json.Marshal(chatRequest{Model: model, Messages: messages, Stream: false})
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, strings.TrimRight(c.Config.MaasBaseURL, "/")+"/chat/completions", bytes.NewReader(body))
	if err != nil {
		return "", err
	}
	req.Header.Set("Authorization", "Bearer "+c.Config.MaasAPIKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.HTTP.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 300 {
		return "", errors.New(resp.Status)
	}
	var parsed chatResponse
	if err := json.NewDecoder(resp.Body).Decode(&parsed); err != nil {
		return "", err
	}
	if len(parsed.Choices) == 0 {
		return "", errors.New("empty ai response")
	}
	return parsed.Choices[0].Message.Content, nil
}

func extractRecipeIDs(text string) []int64 {
	var result struct {
		RecipeIDs []int64 `json:"recipe_ids"`
	}
	_ = json.Unmarshal([]byte(sliceJSON(text)), &result)
	return result.RecipeIDs
}

func sliceJSON(text string) string {
	start := strings.Index(text, "{")
	end := strings.LastIndex(text, "}")
	if start >= 0 && end > start {
		return text[start : end+1]
	}
	return "{}"
}
