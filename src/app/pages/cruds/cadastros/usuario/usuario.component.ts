import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { UsuarioService } from 'src/app/services/cruds/cadastros/usuario.service';
import { MensagemService } from 'src/app/services/mensagem.service';

@Component({
  selector: 'app-usuario',
  templateUrl: './usuario.component.html',
  styleUrl: './usuario.component.scss'
})
export class UsuarioComponent implements OnInit {
  protected cabecalhosEnviar: any[] = [
    {
      CampoTitulo: "Nome"
    },
    {
      CampoTitulo: "Email"
    },
    {
      CampoTitulo: "Telefone"
    },
    {
      CampoTitulo: "Departamento"
    },
    {
      CampoTitulo: "Perfil de Acesso"
    },
    {
      CampoTitulo: "Status"
    },
  ];

  protected cabecalhosEditadosEnviar: any[] = [
    {
      CampoTitulo: "Nome"
    },
    {
      CampoTitulo: "Email"
    },
    {
      CampoTitulo: "Telefone"
    },
    {
      CampoTitulo: "Departamento"
    },
    {
      CampoTitulo: "PerfilAcesso"
    },
    {
      CampoTitulo: "Ativo"
    },
  ]

  protected usuarioEnviar: any[] = [];

  protected carregando: boolean = false;

  protected mensagemErro: string = '';

  protected urlAtual = this.activatedRoute.snapshot.url;

  constructor(
    private usuarioService: UsuarioService,
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
      const usuarios = await this.usuarioService.buscarUsuarios().toPromise() || [];

      this.usuarioEnviar = usuarios.map(usuario => ({
        Nome: usuario.Nome,
        Email: usuario.Email,
        Telefone: usuario.Telefone == '17999999999'? 'Não informado' : this.formatarTelefone(usuario.Telefone),
        Departamento: usuario.Departamento,
        PerfilAcesso: usuario.PerfilAcesso,
        Ativo: usuario.Ativo ? 'Sim' : 'Não',
        ID: usuario.UsuarioID
      }));
    } catch (error) {
      throw error;
    }
  }

  private formatarTelefone(telefone: string): string {
    if (!telefone) return '';

    const numeros = telefone.replace(/\D/g, ''); // remove tudo que não for número

    if (numeros.length === 11) {
      // Formato celular: (XX) 9XXXX-XXXX
      return `(${numeros.substring(0, 2)}) ${numeros.substring(2, 7)}-${numeros.substring(7)}`;
    } else if (numeros.length === 10) {
      // Formato fixo: (XX) XXXX-XXXX
      return `(${numeros.substring(0, 2)}) ${numeros.substring(2, 6)}-${numeros.substring(6)}`;
    }

    return telefone; // retorna como está se não for 10 ou 11 dígitos
  }
}
