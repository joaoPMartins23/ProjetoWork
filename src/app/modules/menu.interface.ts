export interface IMenu {
  Titulo: string;
  Submenus?: ISubmenu[];
  SubmenusAberto?: boolean;
  Rota?: string;
  Icone: string;
  PerfilAcesso: string;
  DepartamentoResponsavelID?: string;
}

interface ISubmenu {
  Titulo: string;
  MenuSubmenu?: IMenuSubmenu[];
  MenuSubmenuAberto?: boolean;
  Rota?: string;
  PerfilAcesso: string;
}

interface IMenuSubmenu {
  Titulo:  string;
  Rota: string;
  PerfilAcesso: string;
}
