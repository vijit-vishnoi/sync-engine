package executor

type CodeExecutor interface{
	Execute(code string,languageId int)(string, error)
}