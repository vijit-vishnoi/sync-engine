package executor

import (
	"bytes"
	"encoding/json"
	"net/http"
)

type JDoodleExecutor struct {
	ClientID     string
	ClientSecret string
	URL          string
}

type JDoodleRequest struct {
	Script       string `json:"script"`
	Language     string `json:"language"`
	VersionIndex string `json:"versionIndex"`
	ClientId     string `json:"clientId"`
	ClientSecret string `json:"clientSecret"`
}

type JDoodleResponse struct {
	Output     string `json:"output"`
	Error      string `json:"error"`
	StatusCode int    `json:"statusCode"`
}

func NewJDoodleExecutor(clientId, clientSecret string) *JDoodleExecutor {
	return &JDoodleExecutor{
		ClientID:     clientId,
		ClientSecret: clientSecret,
		URL:          "https://api.jdoodle.com/v1/execute",
	}
}

func (j *JDoodleExecutor) Execute(code string, languageId int) (string, error) {
	langMap := map[int]string{
		71: "nodejs",
		60: "go",
		70: "python3",
	}

	langName, exists := langMap[languageId]
	if !exists {
		langName = "nodejs" 
	}

	payload := JDoodleRequest{
		Script:       code,
		Language:     langName,
		VersionIndex: "0",
		ClientId:     j.ClientID,
		ClientSecret: j.ClientSecret,
	}

	jsonData, err := json.Marshal(payload)
	if err != nil {
		return "", err
	}

	req, err := http.NewRequest("POST", j.URL, bytes.NewBuffer(jsonData))
	if err != nil {
		return "", err
	}
	req.Header.Add("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	var result JDoodleResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", err
	}

	if result.Error != "" && result.Output == "" {
		return "Execution Error: " + result.Error, nil
	}

	return result.Output, nil
}