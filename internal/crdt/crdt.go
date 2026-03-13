package crdt

type Identifier struct{
	Digit int `json:"digit"`
	SiteId string `json:"siteId"`
}
type Char struct{
	Value rune `json:"value"`
	Position []Identifier `json:"position"`
}

func ComparePostion(pos1,pos2 []Identifier)int{
	minLenth:=min(len(pos1),len(pos2))
	for  i:=0;i<minLenth;i++{
		id1:=pos1[i]
		id2:=pos2[i]
		if id1.Digit<id2.Digit{
			return -1
		} 
		if id1.Digit>id2.Digit{
			return 1
		}
		if id1.SiteId<id2.SiteId{
			return -1
		} else if id1.SiteId>id2.SiteId{
			return 1
		}
	}
	if len(pos1)<len(pos2) {
		return -1
	} 
	if len(pos1)>len(pos2){
		return 1
	}
	return 0
}