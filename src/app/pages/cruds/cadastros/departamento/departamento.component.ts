import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { DepartamentoService } from 'src/app/services/cruds/cadastros/departamento.service';
import { MensagemService } from 'src/app/services/mensagem.service';

@Component({
  selector: 'app-departamento',
  templateUrl: './departamento.component.html',
  styleUrl: './departamento.component.scss'
})
export class DepartamentoComponent implements OnInit {
  protected cabecalhosEnviar: any[] = [
    {
      CampoTitulo: "Departamento"
    },
    {
      CampoTitulo: "Status"
    },
  ];

  protected cabecalhosEditadosEnviar: any[] = [
    {
      CampoTitulo: "Departamento"
    },
    {
      CampoTitulo: "Ativo"
    },
  ]

  protected departamentoEnviar: any[] = [];

  protected carregando: boolean = false;

  protected mensagemErro: string = '';

  protected urlAtual = this.activatedRoute.snapshot.url;

  constructor(
    private departamentoService: DepartamentoService,
    private mensagemService: MensagemService,
    private activatedRoute: ActivatedRoute,
  ) { }

  ngOnInit(): void {
    try {
      this.carregando = true;
      this.buscarConteudo();
    }
    catch (err: any) {
      this.mensagemErro = err.Error.Mensagem;
      console.log(err);
    }
    finally {
      this.carregando = false;
    }
  }

  private async buscarConteudo(): Promise<void> {
    try {
      const departamentos = await this.departamentoService.buscarDepartamentos().toPromise() || [];

      this.departamentoEnviar = departamentos.map(departamento => ({
        Departamento: departamento.Departamento,
        Ativo: departamento.Ativo ? 'Sim' : 'Não',
        ID: departamento.DepartamentoID
      }));
    } catch (error) {
      throw error;
    }
  }
}
