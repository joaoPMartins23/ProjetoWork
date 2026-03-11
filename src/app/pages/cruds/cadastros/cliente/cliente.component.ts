import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ClienteService } from 'src/app/services/cruds/cadastros/cliente.service';
import { MensagemService } from 'src/app/services/mensagem.service';

@Component({
  selector: 'app-cliente',
  templateUrl: './cliente.component.html',
  styleUrl: './cliente.component.scss'
})
export class ClienteComponent implements OnInit {
  protected cabecalhosEnviar: any[] = [
    {
      CampoTitulo: "Código Alternativo"
    },
    {
      CampoTitulo: "Nome do Cliente"
    },
    {
      CampoTitulo: "Razao Social"
    },
    {
      CampoTitulo: "Nome Fantasia"
    },
    {
      CampoTitulo: "CPF/CNPJ"
    },
    {
      CampoTitulo: "Cidade"
    },
    {
      CampoTitulo: "Telefone"
    },
  ];

  protected cabecalhosEditadosEnviar: any[] = [
    {
      CampoTitulo: "Codigo"
    },
    {
      CampoTitulo: "NomeCliente"
    },
    {
      CampoTitulo: "RazaoSocial"
    },
    {
      CampoTitulo: "NomeFantasia"
    },
    {
      CampoTitulo: "Cnpj"
    },
    {
      CampoTitulo: "Cidade"
    },
    {
      CampoTitulo: "Telefone"
    },
  ]

  protected clienteEnviar: any[] = [];

  protected carregando: boolean = false;

  protected mensagemErro: string = '';

  protected urlAtual = this.activatedRoute.snapshot.url;

  constructor(
    private activatedRoute: ActivatedRoute,
    private clienteService: ClienteService
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
      const clientes = await this.clienteService.buscarClientes().toPromise() || [];

      console.log(clientes);

      this.clienteEnviar = clientes.map(cliente => ({
        RazaoSocial:
          cliente.RazaoSocial
            ? cliente.RazaoSocial
            : 'Não informado',

        NomeFantasia:
          cliente.NomeFantasia
            ? cliente.NomeFantasia
            : 'Não informado',

        Cnpj:
          cliente.Cnpj
            ? this.formatarCpfCnpj(cliente.Cnpj)
            : 'Não informado',

        Cidade:
          cliente.Cidade ?? 'Não informado',

        Telefone:
          cliente.Telefone && cliente.Telefone !== '17999999999'
            ? this.formatarTelefone(cliente.Telefone)
            : 'Não informado',

        NomeCliente:
          cliente.NomeCliente ?? 'Não informado',

        Codigo:
          cliente.Codigo ?? 'Não informado',

        ID: cliente.ClienteID
      }));

    } catch (error) {
      throw error;
    }
  }

  private formatarCpfCnpj(valor: string): string {
    if (!valor) return '';
    const numeros = valor.replace(/\D/g, '');
    if (numeros.length === 11) {
      // CPF: 000.000.000-00
      return `${numeros.substring(0, 3)}.${numeros.substring(3, 6)}.${numeros.substring(6, 9)}-${numeros.substring(9, 11)}`;
    } else if (numeros.length === 14) {
      // CNPJ: 00.000.000/0000-00
      return `${numeros.substring(0, 2)}.${numeros.substring(2, 5)}.${numeros.substring(5, 8)}/${numeros.substring(8, 12)}-${numeros.substring(12, 14)}`;
    }
    return valor;
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