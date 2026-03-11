export interface IProjetoView {
  ProjetoID: string,
  Projeto: string,
  Tipo: string,
  DataHoraInicio: string,
  DepartamentoResponsavelID: string
}

export interface IProjetoForm {
  Projeto: string,
  Tipo: string,
  DepartamentoResponsavelID: string
}
