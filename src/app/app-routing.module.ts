import { ChamadosProjetosComponent } from './pages/chamados/chamados-projetos/chamados-projetos.component';
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { AutenticadoGuard } from './guards/autenticado.guard';
import { AdministradorGuard } from './guards/administrador.guard';
import { TecnicoGuard } from './guards/tecnico.guard';

import { LoginComponent } from './pages/login/login.component';
import { AppMainComponent } from './components/app.main/app.main.component';
import { HomeComponent } from './pages/home/home.component';
import { ResetSenhaComponent } from './pages/reset-senha/reset-senha.component';
import { UsuarioComponent } from './pages/cruds/cadastros/usuario/usuario.component';
import { DepartamentoComponent } from './pages/cruds/cadastros/departamento/departamento.component';
import { NovoChamadoComponent } from './pages/chamados/novo-chamado/novo-chamado.component';
import { DetalhesChamadoComponent } from './pages/chamados/detalhes-chamado/detalhes-chamado.component';
import { ChamadosAbertosPorMimComponent } from './pages/chamados/chamados-abertos-por-mim/chamados-abertos-por-mim.component';
import { ChamadosAbertosEquipeComponent } from './pages/chamados/chamados-abertos-equipe/chamados-abertos-equipe.component';
import { ChamadosMinhaResponsabilidadeComponent } from './pages/chamados/chamados-minha-responsabilidade/chamados-minha-responsabilidade.component';
import { ChamadosResponsabilidadeEquipeComponent } from './pages/chamados/chamados-responsabilidade-equipe/chamados-responsabilidade-equipe.component';
import { ChamadosNaoAtribuidosComponent } from './pages/chamados/chamados-nao-atribuidos/chamados-nao-atribuidos.component';
import { TodosChamadosComponent } from './pages/chamados/todos-chamados/todos-chamados.component';
import { NotFoundComponent } from './pages/not-found/not-found.component';
import { ChamadosInfraestruturaComponent } from './pages/chamados/chamados-infraestrutura/chamados-infraestrutura.component';
import { ChamadosDesenvolvimentoComponent } from './pages/chamados/chamados-desenvolvimento/chamados-desenvolvimento.component';
import { ChamadosMonitoramentoComponent } from './pages/chamados/chamados-monitoramento/chamados-monitoramento.component';
import { NovoChamadoRecorrenteComponent } from './pages/chamados/novo-chamado-recorrente/novo-chamado-recorrente.component';
import { TodosChamadosRecorrentesComponent } from './pages/chamados/todos-chamados-recorrentes/todos-chamados-recorrentes.component';
import { DetalhesChamadosRecorrentesComponent } from './pages/chamados/detalhes-chamados-recorrentes/detalhes-chamados-recorrentes.component';
import { ProjetoComponent } from './pages/cruds/cadastros/projeto/projeto.component';
import { SuperAdministradorGuard } from './guards/superAdministrador.guard';
import { ChamadosDadosComponent } from './pages/chamados/chamados-dados/chamados-dados.component';
import { NovoChamadoSacComponent } from './pages/chamados/novo-chamado-sac/novo-chamado-sac.component';
import { ClienteComponent } from './pages/cruds/cadastros/cliente/cliente.component';
import { DetalhesChamadosSacComponent } from './pages/chamados/detalhes-chamados-sac/detalhes-chamados-sac.component';
import { TodosChamadosSacComponent } from './pages/chamados/todos-chamados-sac/todos-chamados-sac.component';
import { ChamadoRelatorioPrintComponent } from './components/chamado-relatorio-print/chamado-relatorio-print.component';
import { ChamadosCopiaComponent } from './pages/chamados/chamados-copia/chamados-copia.component';

const routes: Routes = [
  { path: 'Login', component: LoginComponent },
  { path: 'RecuperarSenha', component: ResetSenhaComponent },

  { path: '', component: AppMainComponent, canActivate: [AutenticadoGuard], children: [
    { path: '', component: HomeComponent },
    { path: 'Home', redirectTo: '', pathMatch: 'full' },

    { path: 'Usuarios', component: UsuarioComponent, canActivate: [SuperAdministradorGuard] },
    { path: 'Usuarios/Novo', component: UsuarioComponent, canActivate: [SuperAdministradorGuard] },
    { path: 'Usuarios/Editar/:UsuarioID', component: UsuarioComponent, canActivate: [SuperAdministradorGuard] },

    { path: 'Departamentos', component: DepartamentoComponent, canActivate: [SuperAdministradorGuard] },
    { path: 'Departamentos/Novo', component: DepartamentoComponent, canActivate: [SuperAdministradorGuard] },
    { path: 'Departamentos/Editar/:DepartamentoID', component: DepartamentoComponent, canActivate: [SuperAdministradorGuard] },

    { path: 'Projetos', component: ProjetoComponent, canActivate: [AdministradorGuard] },
    { path: 'Projetos/Novo', component: ProjetoComponent, canActivate: [AdministradorGuard] },
    { path: 'Projetos/Editar/:ProjetoID', component: ProjetoComponent, canActivate: [AdministradorGuard] },

    { path: 'Clientes', component: ClienteComponent, canActivate: [TecnicoGuard] },
    { path: 'Clientes/Novo', component: ClienteComponent, canActivate: [TecnicoGuard] },
    { path: 'Clientes/Editar/:ClienteID', component: ClienteComponent, canActivate: [TecnicoGuard] },

    { path: 'Chamados/Novo', component: NovoChamadoComponent },
    { path: 'Chamados/NovoRecorrente', component: NovoChamadoRecorrenteComponent },
    { path: 'Chamados/Detalhes/:ChamadoID', component: DetalhesChamadoComponent },
    { path: 'Chamados/Detalhes/Recorrentes/:ChamadoRecorrenteID', component: DetalhesChamadosRecorrentesComponent },
    { path: 'Chamados/AbertosPorMim', component: ChamadosAbertosPorMimComponent },
    { path: 'Chamados/AbertosEquipe', component: ChamadosAbertosEquipeComponent },
    { path: 'Chamados/Todos', component: TodosChamadosComponent },
    { path: 'Chamados/TodosRecorrentes', component: TodosChamadosRecorrentesComponent, canActivate: [TecnicoGuard] },
    { path: 'Chamados/SobMinhaResponsabilidade', component: ChamadosMinhaResponsabilidadeComponent, canActivate: [TecnicoGuard] },
    { path: 'Chamados/SobResponsabilidadeEquipe', component: ChamadosResponsabilidadeEquipeComponent, canActivate: [TecnicoGuard] },
    { path: 'Chamados/ChamadosNaoAtribuidos', component: ChamadosNaoAtribuidosComponent, canActivate: [TecnicoGuard] },
    { path: 'Chamados/Infraestrutura', component: ChamadosInfraestruturaComponent, canActivate: [TecnicoGuard] },
    { path: 'Chamados/Desenvolvimento', component: ChamadosDesenvolvimentoComponent, canActivate: [TecnicoGuard] },
    { path: 'Chamados/Monitoramento', component: ChamadosMonitoramentoComponent, canActivate: [TecnicoGuard] },
    { path: 'Chamados/Projetos', component: ChamadosProjetosComponent, canActivate: [TecnicoGuard] },
    { path: 'Chamados/Dados', component: ChamadosDadosComponent, canActivate: [TecnicoGuard] },
    { path: 'Chamados/Novo/Sac', component: NovoChamadoSacComponent },
    { path: 'Chamados/Detalhes/Sac/:ChamadoID', component: DetalhesChamadosSacComponent},
    { path: 'Chamados/Todos/Sac', component: TodosChamadosSacComponent},
    { path: 'Chamados/Copia', component: ChamadosCopiaComponent },

    { path: 'Chamados/Detalhes/Sac/:ChamadoID/Relatorio', component: ChamadoRelatorioPrintComponent }
  ]},

  { path: '**', component: NotFoundComponent }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
