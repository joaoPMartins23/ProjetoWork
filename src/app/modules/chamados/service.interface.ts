export interface IServico {
  ServicoID: string;
  Servico: string;
  DepartamentoResponsavelID: string;
  Unidade: string | null;
  TipoServico: ITipoServico[];
}

export interface ITipoServico {
  TipoServicoID: string;
  TipoServico: string;
}
