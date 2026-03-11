export interface IChamadoRecorrenteForm {
  // principais
  Titulo: string;
  Prioridade: string;

  // FKs
  DepartamentoResponsavelID: string;
  UsuarioCriacaoID: string;
  UsuarioResponsavelID?: string | null;
  ServicoID: string;
  TipoServicoID: string;
  BlocoID?: string | null;

  // recorrência
  Frequencia: 'DIARIA' | 'SEMANAL' | 'MENSAL' | 'ANUAL';
  Periodo: 'MATUTINO' | 'VESPERTINO';
  DataInicio: string;           // ISO local (yyyy-MM-ddTHH:mm:ss)
  DataFim?: string | null;

  Dom: boolean;
  Seg: boolean;
  Ter: boolean;
  Qua: boolean;
  Qui: boolean;
  Sex: boolean;
  Sab: boolean;

  DiaDoMes?: number | null;     // 1..31
  MesDoAno?: number | null;   // 1..12

  Ativo: boolean;

  Mensagem: string | null;
}

export interface IChamadoRecorrenteRetornoForm {
  ChamadoRecorrenteID: string;
}

export interface IChamadoRecorrenteView {
  ChamadoRecorrenteID: string;
  Titulo: string;
  Prioridade: string;

  DepartamentoResponsavelID: string;
  UsuarioCriacaoID: string;
  UsuarioResponsavelID: string | null;
  ServicoID: string;
  TipoServicoID: string;
  BlocoID: string | null;

  Frequencia: 'DIARIA' | 'SEMANAL' | 'MENSAL' | 'ANUAL';
  Periodo: 'MATUTINO' | 'VESPERTINO';
  DataInicio: string;
  DataFim: string | null;

  Dom: boolean; Seg: boolean; Ter: boolean; Qua: boolean; Qui: boolean; Sex: boolean; Sab: boolean;

  DiaDoMes: number | null;
  MesDoAno: number | null;

  Ativo: boolean;
  CriadoEm: string;
  AtualizadoEm: string;

  Mensagem: string | null;
}
