export interface Identifier {
  digit: number;
  siteId: string;
}

export interface CRDTChar {
  value: number; 
  position: Identifier[];
}

export interface SyncMessage {
  type: 'init' | 'insert' | 'delete' | 'insert_batch' | 'delete_batch' |'cursor' | 'execute'| 'terminal_output'| 'presence_state';
  char?: CRDTChar;
  chars?:CRDTChar[];
  fullDoc?: CRDTChar[];
  senderId?:string;
  lineNumber?:number;
  column?:number;
  displayName?:string;
  languageId?:number;
  output?:string;
  activeUsers?:{[key:string]:string};
}
