export interface INotificacaoView {
  NotificacaoID: string;
  Mensagem: string;
  DataHoraCriacao: Date;
  UsuarioID: string;
  Lida: boolean;
  UrlDestino: string;
}

export interface INotificacaoForm {
  Mensagem: string;
  UsuarioID: string;
  UrlDestino: string;
  ChamadoID: string;
}
