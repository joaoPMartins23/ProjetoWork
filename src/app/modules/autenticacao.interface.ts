export interface IAutenticacao {
  AccessToken: string;
  RefreshToken: string;
  Usuario: {
    UsuarioID: string;
    Nome: string;
    DepartamentoID: string;
    DepartamentoResponsavelID: string | null;
    Telefone: string;
    Imagem: string;
    PerfilAcesso: string;
  }
}
