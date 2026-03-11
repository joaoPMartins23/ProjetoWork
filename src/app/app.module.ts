import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatMomentDateModule } from '@angular/material-moment-adapter';
import { GoogleMapsModule } from '@angular/google-maps';
import { NgxPaginationModule } from 'ngx-pagination';
import { NgSelectModule } from '@ng-select/ng-select';
import { DataTablesModule } from 'angular-datatables';
import { NgxExtendedPdfViewerModule } from 'ngx-extended-pdf-viewer';
import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';
import { NgxDocViewerModule } from 'ngx-doc-viewer';

import { LoginComponent } from './pages/login/login.component';
import { AppMainComponent } from './components/app.main/app.main.component';
import { HomeComponent } from './pages/home/home.component';
import { ResetSenhaComponent } from './pages/reset-senha/reset-senha.component';
import { MenuLateralComponent } from './components/menu-lateral/menu-lateral.component';
import { AuthInterceptor } from './auth.interceptor';
import { TabelaGenericaComponent } from './components/cruds/tabela-generica/tabela-generica.component';
import { MensagemComponent } from "./components/mensagem/mensagem.component";
import { UsuarioComponent } from './pages/cruds/cadastros/usuario/usuario.component';
import { UsuarioFormularioComponent } from './components/cruds/cadastros/usuario-formulario/usuario-formulario.component';
import { DepartamentoComponent } from './pages/cruds/cadastros/departamento/departamento.component';
import { DepartamentoFormularioComponent } from './components/cruds/cadastros/departamento-formulario/departamento-formulario.component';
import { NovoChamadoComponent } from './pages/chamados/novo-chamado/novo-chamado.component';
import { DetalhesChamadoComponent } from './pages/chamados/detalhes-chamado/detalhes-chamado.component';
import { ChamadosAbertosPorMimComponent } from './pages/chamados/chamados-abertos-por-mim/chamados-abertos-por-mim.component';
import { RodapeComponent } from './components/rodape/rodape.component';
import { ChamadosAbertosEquipeComponent } from './pages/chamados/chamados-abertos-equipe/chamados-abertos-equipe.component';
import { ChamadosMinhaResponsabilidadeComponent } from './pages/chamados/chamados-minha-responsabilidade/chamados-minha-responsabilidade.component';
import { ChamadosResponsabilidadeEquipeComponent } from './pages/chamados/chamados-responsabilidade-equipe/chamados-responsabilidade-equipe.component';
import { ChamadosNaoAtribuidosComponent } from './pages/chamados/chamados-nao-atribuidos/chamados-nao-atribuidos.component';
import { NotificacaoComponent } from './components/notificacao/notificacao.component';
import { TodosChamadosComponent } from './pages/chamados/todos-chamados/todos-chamados.component';
import { NotFoundComponent } from './pages/not-found/not-found.component';
import { ChamadosDesenvolvimentoComponent } from './pages/chamados/chamados-desenvolvimento/chamados-desenvolvimento.component';
import { ChamadosInfraestruturaComponent } from './pages/chamados/chamados-infraestrutura/chamados-infraestrutura.component';
import { ChamadosMonitoramentoComponent } from './pages/chamados/chamados-monitoramento/chamados-monitoramento.component';
import { NovoChamadoRecorrenteComponent } from './pages/chamados/novo-chamado-recorrente/novo-chamado-recorrente.component';
import { TodosChamadosRecorrentesComponent } from './pages/chamados/todos-chamados-recorrentes/todos-chamados-recorrentes.component';
import { DetalhesChamadosRecorrentesComponent } from './pages/chamados/detalhes-chamados-recorrentes/detalhes-chamados-recorrentes.component';
import { ProjetoComponent } from './pages/cruds/cadastros/projeto/projeto.component';
import { ProjetoFormularioComponent } from './components/cruds/cadastros/projeto-formulario/projeto-formulario.component';
import { ChamadosProjetosComponent } from './pages/chamados/chamados-projetos/chamados-projetos.component';
import { ChamadosDadosComponent } from './pages/chamados/chamados-dados/chamados-dados.component';
import { NovoChamadoSacComponent } from './pages/chamados/novo-chamado-sac/novo-chamado-sac.component';
import { ClienteComponent } from './pages/cruds/cadastros/cliente/cliente.component';
import { ClienteFormularioComponent } from './components/cruds/cadastros/cliente-formulario/cliente-formulario.component';
import { DetalhesChamadosSacComponent } from './pages/chamados/detalhes-chamados-sac/detalhes-chamados-sac.component';
import { TodosChamadosSacComponent } from './pages/chamados/todos-chamados-sac/todos-chamados-sac.component';
import { ChamadoRelatorioPrintComponent } from './components/chamado-relatorio-print/chamado-relatorio-print.component';
import { ChamadosCopiaComponent } from './pages/chamados/chamados-copia/chamados-copia.component';

@NgModule({
  declarations: [
    AppComponent,
    AppMainComponent,
    MenuLateralComponent,
    LoginComponent,
    HomeComponent,
    ResetSenhaComponent,
    TabelaGenericaComponent,
    MensagemComponent,
    RodapeComponent,
    UsuarioComponent,
    UsuarioFormularioComponent,
    DepartamentoComponent,
    DepartamentoFormularioComponent,
    NovoChamadoComponent,
    DetalhesChamadoComponent,
    ChamadosAbertosPorMimComponent,
    ChamadosAbertosEquipeComponent,
    ChamadosMinhaResponsabilidadeComponent,
    ChamadosResponsabilidadeEquipeComponent,
    ChamadosNaoAtribuidosComponent,
    ChamadosInfraestruturaComponent,
    ChamadosDesenvolvimentoComponent,
    ChamadosMonitoramentoComponent,
    NotificacaoComponent,
    TodosChamadosComponent,
    NotFoundComponent,
    NovoChamadoRecorrenteComponent,
    TodosChamadosRecorrentesComponent,
    DetalhesChamadosRecorrentesComponent,
    ProjetoComponent,
    ProjetoFormularioComponent,
    ChamadosProjetosComponent,
    ChamadosDadosComponent,
    NovoChamadoSacComponent,
    ClienteComponent,
    ClienteFormularioComponent,
    DetalhesChamadosSacComponent,
    TodosChamadosSacComponent,
    ChamadoRelatorioPrintComponent,
    ChamadosCopiaComponent,
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    AppRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    MatToolbarModule,
    MatButtonModule,
    MatDatepickerModule,
    MatMomentDateModule,
    GoogleMapsModule,
    NgxPaginationModule,
    NgSelectModule,
    DataTablesModule,
    NgxExtendedPdfViewerModule,
    HttpClientModule,
    NgxDocViewerModule,
  ],
  providers: [
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true
    }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
