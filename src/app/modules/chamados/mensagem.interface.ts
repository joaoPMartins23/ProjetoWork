export interface IMensagemView {
  MensagemID: string;
  Mensagem: string;
  DataHoraInicio: string;
  DataHoraFim: string;
  UsuarioID: string;
  Interno: boolean;
  Arquivos: IArquivoView[];
}

export interface IMensagem {
  Mensagem: string;
  DataHoraInicio: string;
  DataHoraFim: string;
  UsuarioID: string;
  Interno: boolean;
  Arquivos: IArquivo[];
}

export interface IArquivoView {
  ArquivoID: string;
  LinkArquivo: string;
}

export interface IArquivo {
  LinkArquivo: string;
  NomeArquivo?: string;
}
