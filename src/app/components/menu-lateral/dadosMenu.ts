import { IMenu } from "src/app/modules/menu.interface";

export const DadosMenu: IMenu[] = [
  {
    Titulo: "Dashboard",
    Icone: 'home',
    Rota: 'Home',
    PerfilAcesso: "Usuario",
  },
  {
    Titulo: "Abrir Chamado",
    Icone: 'plus-circle',
    PerfilAcesso: "Tecnico",
    Submenus: [
      {
        Titulo: "Novo Chamado",
        Rota: "Chamados/Novo",
        PerfilAcesso: "Usuario"
      },
      {
        Titulo: "Novo Chamado Recorrente",
        Rota: "Chamados/NovoRecorrente",
        PerfilAcesso: "Tecnico"
      }
    ]
  },
  {
    Titulo: "Ver Chamados",
    Icone: 'headphones',
    Submenus: [
      {
        Titulo: "Todos os Chamados",
        Rota: "Chamados/Todos",
        PerfilAcesso: "Usuario"
      },
      {
        Titulo: "Chamados Recorrentes",
        Rota: "Chamados/TodosRecorrentes",
        PerfilAcesso: "Tecnico"
      },
      {
        Titulo: "Infraestrutura",
        Rota: "Chamados/Infraestrutura",
        PerfilAcesso: "Usuario"
      },
      {
        Titulo: "Desenvolvimento",
        Rota: "Chamados/Desenvolvimento",
        PerfilAcesso: "Usuario"
      },
      {
        Titulo: "Monitoramento",
        Rota: "Chamados/Monitoramento",
        PerfilAcesso: "Usuario"
      },
      {
        Titulo: "Dados",
        Rota: "Chamados/Dados",
        PerfilAcesso: "Usuario"
      },
      {
        Titulo: "Não Atribuídos",
        Rota: "Chamados/ChamadosNaoAtribuidos",
        PerfilAcesso: "Tecnico"
      },
      {
        Titulo: "Sob Minha Responsabilidade",
        Rota: "Chamados/SobMinhaResponsabilidade",
        PerfilAcesso: "Tecnico"
      },
      {
        Titulo: "Abertos por Mim",
        Rota: "Chamados/AbertosPorMim",
        PerfilAcesso: "Usuario"
      },
      {
        Titulo: "Responsabilidade da Minha Equipe",
        Rota: "Chamados/SobResponsabilidadeEquipe",
        PerfilAcesso: "Tecnico"
      },
      {
        Titulo: "Abertos pela Minha Equipe",
        Rota: "Chamados/AbertosEquipe",
        PerfilAcesso: "Usuario"
      },
      {
        Titulo: "Chamados por Projetos",
        Rota: "Chamados/Projetos",
        PerfilAcesso: "Tecnico"
      },
      {
        Titulo: 'Em Cópia',
        Rota: 'Chamados/Copia',
        PerfilAcesso: 'Usuario'
      }
    ],
    PerfilAcesso: "Usuario"
  },
  {
    Titulo: "SAC",
    Icone: 'phone',
    PerfilAcesso: "Tecnico",
    DepartamentoResponsavelID: "EC526DA6-08C3-440E-A64E-AED504AF96DF",
    Submenus: [
      {
        Titulo: "Novo Chamado SAC",
        Rota: "Chamados/Novo/Sac",
        PerfilAcesso: "Tecnico"
      },
      {
        Titulo: "Ver Chamados de SAC",
        Rota: "Chamados/Todos/Sac",
        PerfilAcesso: "Tecnico"
      },
      {
        Titulo: "Clientes SAC",
        Rota: "Clientes",
        PerfilAcesso: "Tecnico"
      }
    ]
  },
  {
    Titulo: "Projetos",
    Icone: 'folder-open',
    Submenus: [
      {
        Titulo: "Cadastro de Projetos",
        Rota: "Projetos",
        PerfilAcesso: "Administrador"
      },
      {
        Titulo: "Chamados por Projetos",
        Rota: "Chamados/Projetos",
        PerfilAcesso: "Tecnico"
      }
    ],
    PerfilAcesso: "Tecnico",
  },
  {
    Titulo: "Cadastros",
    Icone: 'clipboard',
    Submenus: [
      {
        Titulo: "Usuários",
        Rota: "Usuarios",
        PerfilAcesso: "Administrador"
      },
      {
        Titulo: "Departamentos",
        Rota: "Departamentos",
        PerfilAcesso: "Administrador"
      }
    ],
    PerfilAcesso: "SuperAdministrador"
  },
]
