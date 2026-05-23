package executor

import (
	"bytes"
	"encoding/json"
	"net/http"
)

type PistonExecutor struct {
	URL string
}

type PistonRequest struct {
	Language string `json:"language"`
	Version  string `json:"version"`
	Files    []File `json:"files"`
}

type File struct {
	Content string `json:"content"`
}

type PistonResponse struct {
	Run struct {
		Output string `json:"output"`
		Stderr string `json:"stderr"`
	} `json:"run"`
	Message string `json:"message"` 
}

func NewPistonExecutor() *PistonExecutor {
	return &PistonExecutor{
		URL: "https://emkc.org/api/v2/piston/execute",
	}
}

func (p *PistonExecutor) Execute(code string, languageId int) (string, error) {
	langMap := map[int]string{
		71: "javascript", 
		60: "go",
		70: "python",
	}

	langName, exists := langMap[languageId]
	if !exists {
		langName = "javascript" 
	}

	payload := PistonRequest{
		Language: langName,
		Version:  "*", 
		Files: []File{
			{Content: code},
		},
	}

	jsonData, err := json.Marshal(payload)
	if err != nil {
		return "", err
	}

	req, err := http.NewRequest("POST", p.URL, bytes.NewBuffer(jsonData))
	if err != nil {
		return "", err
	}
	req.Header.Add("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	var result PistonResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", err
	}

	if result.Message != "" {
		return "Piston Error: " + result.Message, nil
	}

	return result.Run.Output, nil
}