package executor

import (
	"bytes"
	"encoding/json"
	"net/http"
)

type Judge0Executor struct {
	APIKey string
	URL    string
}
type Judge0Request struct {
	SourceCode string `json:"source_code"`
	LanguageID int		`json:"language_id"`
}

type Judge0Response struct{
	Stdout *string `json:"stdout"`
	Stderr *string `json:"stderr"`
	CompileOutput *string `json:"compile_output"`
}

func NewJudge0Executor(apiKey string) *Judge0Executor {
	return &Judge0Executor{
		APIKey: apiKey,
		URL:    "https://judge0-ce.p.rapidapi.com",
	}
}

func (j *Judge0Executor) Execute(source_code string, language_Id int) (string, error) {
	payload:=Judge0Request{
		SourceCode:source_code,
		LanguageID:language_Id,
	}
	jsonData,err:=json.Marshal(payload)
	if err!=nil{
		return "",err
	}
	req,err:=http.NewRequest("POST",j.URL+"/submissions?base64_encoded=false&wait=true",bytes.NewBuffer(jsonData))
	if err!=nil{
		return "",err
	}

	req.Header.Add("Content-Type","application/json")
	req.Header.Add("X-RapidAPI-Host","judge0-ce.p.rapidapi.com")
	req.Header.Add("X-RapidAPI-Key",j.APIKey)
	
	resp,err:=http.DefaultClient.Do(req)
	if err!=nil{
		return "",err
	}

	defer resp.Body.Close()
	var result Judge0Response
	if err:=json.NewDecoder(resp.Body).Decode(&result);err!=nil{
		return "",err
	}

	if result.CompileOutput!=nil{
		return *result.CompileOutput,nil
	}
	if result.Stderr!=nil{
		return *result.Stderr,nil
	}
	if result.Stdout!=nil{
		return *result.Stdout,nil
	}
	return "Code executed, but no output was returned.",nil
}