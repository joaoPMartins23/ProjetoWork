import { IMensagem, IMensagemView } from "./mensagem.interface"

export interface IChamadoView {
  ChamadoID: string;
  Titulo: string;
  Protocolo: string;
  Prioridade: string;
  BlocoID: string;
  DataHora: string;
  DataHoraFinalizacao: string;
  UsuarioCriacaoID: string;
  DepartamentoResponsavelID: string;
  UsuarioResponsavelID: string;
  UsuarioFinalizacaoID: string;
  Status: string;
  ServicoID: string;
  TipoServicoID: string;
  PesquisaSatisfacao: string;
  Mensagens: IMensagemView[];
  UsuariosAuxiliares: IUsuariosAuxiliares[];
  ProjetoID: string | null;
  DataHoraInicioProjeto: string;
  DataHoraFinalizacaoProjeto: string;
  DataHoraEstimado: string;
  ClienteID?: string;
  CategoriaID?: string;
  FormaContatoID?: string;
  Produto?: string;
  QuantidadeProduto?: number;
  LoteProduto?: string;
  Fabricacao?: string;
  Validade?: string;
  HoraEnvase?: string;
  LocalCompra?: string;
  Estado?: string;
}

export interface IChamadoViewSimples {
  ChamadoID: string;
  Titulo: string;
  Protocolo: string;
  Prioridade: string;
  DataHora: string;
  DataHoraFinalizacao: string;
  UsuarioCriacaoID: string;
  DepartamentoResponsavelID: string;
  UsuarioResponsavelID: string;
  Status: string;
  ServicoID: string;
  TipoServicoID: string;
  ProjetoID: string | null;
  DataHoraInicioProjeto: string;
  DataHoraFinalizacaoProjeto: string;
  DataHoraEstimado: string;
  PesquisaSatisfacao: string;
  ClienteID?: string;
}

export interface IChamadoForm {
  Titulo: string;
  Prioridade: string;
  DataHora: string;
  DataHoraFinalizacao: string | null;
  UsuarioFinalizacaoID: string | null;
  BlocoID: string | null;
  UsuarioCriacaoID: string;
  DepartamentoResponsavelID: string;
  UsuarioResponsavelID: string;
  Status: string;
  Mensagens: IMensagem;
  ServicoID: string;
  TipoServicoID: string;
  UsuariosAuxiliares?: IUsuariosAuxiliares[];
  UsuarioRealizacaoID: string;
  ProjetoID: string | null;
  DataHoraInicioProjeto: string | null;
  DataHoraFinalizacaoProjeto: string | null;
  DataHoraEstimado: string | null;

  ClienteID?: string;
  CategoriaID?: string;
  FormaContatoID?: string;
  Produto?: string;
  QuantidadeProduto?: number;
  LoteProduto?: string;
  Fabricacao?: string;
  Validade?: string;
  HoraEnvase?: string;
  LocalCompra?: string;
  Estado?: string;
}

export interface IChamadoRetornoForm {
  ChamadoID: string;
}

export interface IUsuariosAuxiliares {
  UsuarioID: string;
}
