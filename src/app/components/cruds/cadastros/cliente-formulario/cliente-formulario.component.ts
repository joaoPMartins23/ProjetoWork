import { Component, OnInit, ElementRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { IClienteForm, IClienteView } from 'src/app/modules/cruds/cadastros/cliente.interface';
import { ClienteService } from 'src/app/services/cruds/cadastros/cliente.service';
import { MensagemService } from 'src/app/services/mensagem.service';

@Component({
  selector: 'app-cliente-formulario',
  templateUrl: './cliente-formulario.component.html',
  styleUrl: './cliente-formulario.component.scss'
})
export class ClienteFormularioComponent implements OnInit {
  protected urlAtual = this.activatedRoute.snapshot.url;
  protected carregando: boolean = false;

  protected clienteID: string = '';
  protected clienteAtual!: IClienteView;

  protected formularioCliente!: FormGroup;

  protected modoCriacao: 'manual' | 'busca' = 'manual';

  protected buscandoDocumento: boolean = false;

  protected clientePreenchidoPorBusca: boolean = false;

  constructor(
    private clienteService: ClienteService,
    private mensagemService: MensagemService,
    private fb: FormBuilder,
    private activatedRoute: ActivatedRoute,
    private router: Router,
    private elementRef: ElementRef,
  ) { }

  async ngOnInit(): Promise<void> {
    try {
      this.carregando = true;

      this.formularioCliente = this.fb.group({
        RazaoSocial: [''],
        NomeFantasia: [''],
        Cnpj: [''],
        TipoLogradouro: [''],
        Logradouro: [''],
        NumeroLogradouro: [''],
        Complemento: [''],
        Bairro: [''],
        Cidade: [''],
        Uf: ['', [Validators.maxLength(2)]],
        Cep: [''],
        Telefone: [''],
        NomeCliente: [''],
        Codigo: ['']
      });

      if (this.urlAtual.length == 2) {
        this.definirModoCriacao('manual');
      }

      if (this.urlAtual.length == 3) {
        this.clienteID = this.activatedRoute.snapshot.paramMap.get('ClienteID') || '';
        this.clienteAtual = await this.clienteService.buscarCliente(this.clienteID).toPromise() || this.clienteAtual;

        this.formularioCliente.patchValue({
          RazaoSocial: this.clienteAtual.RazaoSocial ?? null,
          NomeFantasia: this.clienteAtual.NomeFantasia ?? null,

          Cnpj: this.clienteAtual.Cnpj
            ? this.formatarDocumentoParaExibicao(this.clienteAtual.Cnpj)
            : null,

          TipoLogradouro: this.clienteAtual.TipoLogradouro ?? null,
          Logradouro: this.clienteAtual.Logradouro ?? null,
          NumeroLogradouro: this.clienteAtual.NumeroLogradouro ?? null,
          Complemento: this.clienteAtual.Complemento ?? null,
          Bairro: this.clienteAtual.Bairro ?? null,
          Cidade: this.clienteAtual.Cidade ?? null,
          Uf: this.clienteAtual.Uf ?? null,

          Cep: this.clienteAtual.Cep
            ? this.formatarCepParaExibicao(this.clienteAtual.Cep)
            : null,

          Telefone: this.clienteAtual.Telefone
            ? this.formatarTelefoneParaExibicao(this.clienteAtual.Telefone)
            : null,

          NomeCliente: this.clienteAtual.NomeCliente ?? null,
          Codigo: this.clienteAtual.Codigo ?? null,
        });


        const docNum = this.limparNumeros(this.formularioCliente.get('Cnpj')?.value || '');
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      this.carregando = false;
    }
  }

  onSubmit(): void {
    if (!this.temAlgumCampoPreenchido()) {
      this.mensagemService.adicionarMensagem(
        'Preencha ao menos um campo para salvar o cliente.'
      );
      this.formularioCliente.markAllAsTouched();
      return;
    }

    if (this.formularioCliente.valid) {
      this.carregando = true;

      const cliente: IClienteForm = {
        RazaoSocial: this.valorOuNull(this.formularioCliente.get('RazaoSocial')?.value),
        NomeFantasia: this.valorOuNull(this.formularioCliente.get('NomeFantasia')?.value),

        Cnpj: this.valorOuNull(
          this.formularioCliente.get('Cnpj')?.value
            ? this.limparNumeros(this.formularioCliente.get('Cnpj')?.value)
            : null
        ),

        TipoLogradouro: this.valorOuNull(this.formularioCliente.get('TipoLogradouro')?.value),
        Logradouro: this.valorOuNull(this.formularioCliente.get('Logradouro')?.value),
        NumeroLogradouro: this.valorOuNull(this.formularioCliente.get('NumeroLogradouro')?.value),
        Complemento: this.valorOuNull(this.formularioCliente.get('Complemento')?.value),
        Bairro: this.valorOuNull(this.formularioCliente.get('Bairro')?.value),
        Cidade: this.valorOuNull(this.formularioCliente.get('Cidade')?.value),

        Uf: this.valorOuNull(
          this.formularioCliente.get('Uf')?.value
            ? String(this.formularioCliente.get('Uf')?.value).toUpperCase()
            : null
        ),

        Cep: this.valorOuNull(
          this.formularioCliente.get('Cep')?.value
            ? this.limparNumeros(this.formularioCliente.get('Cep')?.value)
            : null
        ),

        Telefone: this.valorOuNull(
          this.formularioCliente.get('Telefone')?.value
            ? this.limparNumeros(this.formularioCliente.get('Telefone')?.value)
            : null
        ),

        NomeCliente: this.valorOuNull(this.formularioCliente.get('NomeCliente')?.value),
        Codigo: this.valorOuNull(this.formularioCliente.get('Codigo')?.value),
      };

      const mensagemSucesso = this.urlAtual.length == 3
        ? 'Cliente editado!'
        : 'Cliente criado!';

      const serviceCall = this.urlAtual.length == 3
        ? this.clienteService.atualizarCliente(this.clienteID, cliente)
        : this.clienteService.cadastrarCliente(cliente);

      serviceCall.subscribe(() => {
        this.mensagemService.adicionarMensagem(mensagemSucesso);
        this.router.navigate(['/Clientes']);
      }, (error: any) => {
        this.mensagemService.adicionarMensagem(error.error.Resposta);
        console.error(error.error.Resposta);
        this.carregando = false;
      });
    } else {
      // opcional: força aparecer validações
      this.formularioCliente.markAllAsTouched();
    }
  }

  protected mascararTelefone(): void {
    const controle = this.formularioCliente.get('Telefone');
    if (!controle) return;

    const numeros = (controle.value || '').replace(/\D/g, '').slice(0, 11);
    let formatado = numeros;

    if (numeros.length >= 2) formatado = `(${numeros.slice(0, 2)}`;
    if (numeros.length >= 7) formatado += `) ${numeros.slice(2, 7)}-${numeros.slice(7)}`;
    else if (numeros.length > 2) formatado += `) ${numeros.slice(2)}`;

    controle.setValue(formatado, { emitEvent: false });
  }

  protected mascararCep(): void {
    const controle = this.formularioCliente.get('Cep');
    if (!controle) return;

    const n = (controle.value || '').replace(/\D/g, '').slice(0, 8);
    const v = n.length > 5 ? `${n.slice(0, 5)}-${n.slice(5)}` : n;

    controle.setValue(v, { emitEvent: false });
  }

  private limparNumeros(valor: string): string {
    return (valor || '').replace(/\D/g, '');
  }

  private formatarTelefoneParaExibicao(telefone: string): string {
    if (!telefone) return '';
    const numeros = telefone.replace(/\D/g, '');

    if (numeros.length === 11) {
      return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7)}`;
    } else if (numeros.length === 10) {
      return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 6)}-${numeros.slice(6)}`;
    }
    return telefone;
  }

  protected mascararDocumento(): void {
    const controle = this.formularioCliente.get('Cnpj');
    if (!controle) return;

    const n = (controle.value || '').replace(/\D/g, '').slice(0, 14);

    if (n.length <= 11) {
      let v = n;
      if (n.length > 3) v = `${n.slice(0, 3)}.${n.slice(3)}`;
      if (n.length > 6) v = `${n.slice(0, 3)}.${n.slice(3, 6)}.${n.slice(6)}`;
      if (n.length > 9) v = `${n.slice(0, 3)}.${n.slice(3, 6)}.${n.slice(6, 9)}-${n.slice(9)}`;

      controle.setValue(v, { emitEvent: false });
      return;
    }

    let v = n;
    if (n.length > 2) v = `${n.slice(0, 2)}.${n.slice(2)}`;
    if (n.length > 5) v = `${n.slice(0, 2)}.${n.slice(2, 5)}.${n.slice(5)}`;
    if (n.length > 8) v = `${n.slice(0, 2)}.${n.slice(2, 5)}.${n.slice(5, 8)}/${n.slice(8)}`;
    if (n.length > 12) v = `${n.slice(0, 2)}.${n.slice(2, 5)}.${n.slice(5, 8)}/${n.slice(8, 12)}-${n.slice(12)}`;

    controle.setValue(v, { emitEvent: false });
  }

  private formatarDocumentoParaExibicao(documento: string): string {
    const n = (documento || '').replace(/\D/g, '');

    if (n.length === 11) {
      return `${n.slice(0, 3)}.${n.slice(3, 6)}.${n.slice(6, 9)}-${n.slice(9)}`;
    }

    if (n.length === 14) {
      return `${n.slice(0, 2)}.${n.slice(2, 5)}.${n.slice(5, 8)}/${n.slice(8, 12)}-${n.slice(12)}`;
    }

    return documento;
  }

  private formatarCepParaExibicao(cep: string): string {
    const n = (cep || '').replace(/\D/g, '');
    if (n.length !== 8) return cep;
    return `${n.slice(0, 5)}-${n.slice(5)}`;
  }

  protected definirModoCriacao(modo: 'manual' | 'busca'): void {
    this.modoCriacao = modo;
    this.clientePreenchidoPorBusca = false;

    if (modo === 'busca') {
      // No modo busca, trava os campos e deixa só CPF/CNPJ habilitado
      this.desabilitarCamposExcetoDocumento();
      this.formularioCliente.get('Cnpj')?.enable({ emitEvent: false });
      this.formularioCliente.get('Cnpj')?.setValue('', { emitEvent: false });
    } else {
      // Manual: habilita tudo
      this.habilitarTodosCampos();
    }
  }

  private desabilitarCamposExcetoDocumento(): void {
    const camposParaDesabilitar = [
      'RazaoSocial', 'NomeFantasia', 'TipoLogradouro', 'Logradouro', 'NumeroLogradouro',
      'Complemento', 'Bairro', 'Cidade', 'Uf', 'Cep', 'Telefone'
    ];

    camposParaDesabilitar.forEach(c => this.formularioCliente.get(c)?.disable({ emitEvent: false }));
  }

  private habilitarTodosCampos(): void {
    Object.keys(this.formularioCliente.controls).forEach(c => {
      this.formularioCliente.get(c)?.enable({ emitEvent: false });
    });
  }

  protected documentoValidoParaBusca(): boolean {
    const doc = this.limparNumeros(this.formularioCliente.get('Cnpj')?.value || '');
    return doc.length === 11 || doc.length === 14;
  }

  protected async buscarClientePorDocumento(): Promise<void> {
    const doc = this.limparNumeros(this.formularioCliente.get('Cnpj')?.value || '');
    const nome = (this.formularioCliente.get('NomeCliente')?.value || '').trim();

    if (!(doc.length === 11 || doc.length === 14) || nome.length < 3) {
      this.mensagemService.adicionarMensagem('Informe um CPF/CNPJ válido e o nome do cliente.');
      return;
    }

    try {
      this.buscandoDocumento = true;

      await this.clienteService
        .cadastrarClientePorCpfCnpj(doc, nome)
        .toPromise();

      this.mensagemService.adicionarMensagem('Cliente criado com sucesso!');
      this.router.navigate(['/Clientes']);
    } catch (error: any) {
      this.mensagemService.adicionarMensagem(error?.error?.Resposta || 'Erro ao criar cliente.');
      console.error(error);
    } finally {
      this.buscandoDocumento = false;
    }
  }

  protected limparClienteBuscado(): void {
    // Mantém no modo busca e reseta tudo, travando campos novamente
    this.formularioCliente.reset({
      RazaoSocial: '',
      NomeFantasia: '',
      Cnpj: '',
      TipoLogradouro: '',
      Logradouro: '',
      NumeroLogradouro: '',
      Complemento: '',
      Bairro: '',
      Cidade: '',
      Uf: '',
      Cep: '',
      Telefone: '',
      NomeCliente: '',
      Codigo: ''
    });

    this.clientePreenchidoPorBusca = false;

    this.desabilitarCamposExcetoDocumento();
    this.formularioCliente.get(
      'Cnpj')?.enable({ emitEvent: false });
  }

  protected dadosValidosParaBusca(): boolean {
    const doc = this.limparNumeros(this.formularioCliente.get('Cnpj')?.value || '');
    const nome = (this.formularioCliente.get('NomeCliente')?.value || '').trim();

    const docOk = doc.length === 11 || doc.length === 14;
    const nomeOk = nome.length >= 3; // ajuste conforme sua regra

    return docOk && nomeOk;
  }

  private temAlgumCampoPreenchido(): boolean {
    const valores = this.formularioCliente.value;

    return Object.entries(valores).some(([_, valor]) => {
      if (valor === null || valor === undefined) return false;
      if (typeof valor === 'string') return valor.trim() !== '';
      return true;
    });
  }

  private valorOuNull(valor: any): string | null {
    if (valor === null || valor === undefined) return null;
    if (typeof valor === 'string' && valor.trim() === '') return null;
    return valor;
  }

}
