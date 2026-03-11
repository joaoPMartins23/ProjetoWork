export interface IUsuarioView {
  UsuarioID: string;
  Nome: string;
  Email: string;
  Telefone: string;
  DepartamentoID: string;
  Departamento: string;
  DepartamentoResponsavelID: string;
  PerfilAcesso: string;
  Imagem: string;
  Ativo: boolean;
}

export interface IUsuarioForm {
  Nome: string;
  Email: string;
  Senha: string;
  Telefone: string;
  DepartamentoID: string;
  DepartamentoResponsavelID: string | null;
  PerfilAcessoID: string;
  Imagem: string;
  Ativo: boolean;
}
