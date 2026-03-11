import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DepartamentoResponsavelService } from 'src/app/services/chamados/departamentoResponsavel.service';
import { ProjetoService } from 'src/app/services/cruds/cadastros/projeto.service';
import { environment } from 'src/environments/environment';
import * as CryptoJS from 'crypto-js';

@Component({
  selector: 'app-projeto',
  templateUrl: './projeto.component.html',
  styleUrl: './projeto.component.scss'
})
export class ProjetoComponent implements OnInit {
  private readonly DEPARTAMENTO_SEM_TIPO: string = '7C947571-158C-4D4E-AD2B-D5A8417B1FEF';

  protected departamentoResponsavel: string | null =
    CryptoJS.AES.decrypt(
      localStorage.getItem('DepartamentoResponsavelID') || '',
      environment.chavePrivada
    ).toString(CryptoJS.enc.Utf8) || null;

  protected cabecalhosEnviar: any[] = [
    {
      CampoTitulo: 'Projeto'
    },
    {
      CampoTitulo: 'Tipo'
    },
    {
      CampoTitulo: 'Departamento Responsável'
    },
    {
      CampoTitulo: 'Data de Início'
    },
  ];

  protected cabecalhosEditadosEnviar: any[] = [
    {
      CampoTitulo: 'Projeto'
    },
    {
      CampoTitulo: 'Tipo'
    },
    {
      CampoTitulo: 'DepartamentoResponsavel'
    },
    {
      CampoTitulo: 'DataInicio'
    },
  ];

  protected projetoEnviar: any[] = [];

  protected carregando: boolean = false;

  protected mensagemErro: string = '';

  protected urlAtual = this.activatedRoute.snapshot.url;

  constructor(
    private projetoService: ProjetoService,
    private departamentoResponsavelService: DepartamentoResponsavelService,
    private activatedRoute: ActivatedRoute,
  ) { }

  ngOnInit(): void {
    try {
      if (this.departamentoResponsavel === this.DEPARTAMENTO_SEM_TIPO) {
        this.cabecalhosEnviar = this.cabecalhosEnviar
          .filter(c => c.CampoTitulo !== 'Tipo');

        this.cabecalhosEditadosEnviar = this.cabecalhosEditadosEnviar
          .filter(c => c.CampoTitulo !== 'Tipo');
      }

      this.carregando = true;
      this.buscarConteudo();
    }
    catch (err: any) {
      this.mensagemErro = err?.Error?.Mensagem || 'Erro ao carregar projetos.';
      console.log(err);
    }
    finally {
      this.carregando = false;
    }
  }

  private async buscarConteudo(): Promise<void> {
    try {
      const projetos = await this.projetoService.buscarProjetos().toPromise() || [];
      const departamentosResponsaveis =
        await this.departamentoResponsavelService.buscarDepartamentosResponsaveis().toPromise() || [];

      const ocultarTipo = this.departamentoResponsavel === this.DEPARTAMENTO_SEM_TIPO;

      this.projetoEnviar = projetos.map(projeto => {
        const departamentoNome =
          departamentosResponsaveis.find(departamento =>
            departamento.DepartamentoResponsavelID === projeto.DepartamentoResponsavelID
          )?.DepartamentoResponsavel || '';

        return {
          Projeto: projeto.Projeto,
          // só adiciona Tipo se não for para ocultar
          ...( !ocultarTipo && { Tipo: projeto.Tipo } ),
          DepartamentoResponsavel: departamentoNome,
          DataInicio: this.formatIsoToBrDateTime(projeto.DataHoraInicio),
          ID: projeto.ProjetoID
        };
      });
    } catch (error) {
      throw error;
    }
  }

  private formatIsoToBrDateTime(iso: string | null | undefined): string {
    if (!iso) return '';

    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';

    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();

    return `${dd}/${mm}/${yyyy}`;
  }
}
