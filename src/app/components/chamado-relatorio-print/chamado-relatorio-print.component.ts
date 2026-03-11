import { Component, OnInit, OnDestroy, Renderer2 } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Location } from '@angular/common';

import { ChamadoService } from 'src/app/services/chamados/chamado.service';
import { UsuarioService } from 'src/app/services/cruds/cadastros/usuario.service';
import { DepartamentoResponsavelService } from 'src/app/services/chamados/departamentoResponsavel.service';
import { ServicoService } from 'src/app/services/chamados/servico.service';
import { ClienteService } from 'src/app/services/cruds/cadastros/cliente.service';
import { CategoriaService } from 'src/app/services/chamados/categoria.service';
import { FormaContatoService } from 'src/app/services/chamados/formaContato.service';
import { IChamadoView } from 'src/app/modules/chamados/chamado.interface';
import { IUsuarioView } from 'src/app/modules/cruds/cadastros/usuario.interface';
import { IDepartamentoResponsavel } from 'src/app/modules/chamados/departamentoResponsavel.interface';
import { IServico, ITipoServico } from 'src/app/modules/chamados/service.interface';
import { IClienteView } from 'src/app/modules/cruds/cadastros/cliente.interface';
import { ICategoria } from 'src/app/modules/chamados/categoria.interface';
import { IFormaContato } from 'src/app/modules/chamados/formaContato.interface';
import { IArquivoView, IMensagemView } from 'src/app/modules/chamados/mensagem.interface';

type KV = { label: string; value: string; wide?: boolean };

type MsgPrint = {
  autor: string;
  data: string;
  texto: string;
  interna: boolean;
  imagens: string[];
  arquivos: IArquivoView[]; // opcional, se quiser listar tb
};


@Component({
  selector: 'app-chamado-relatorio-print',
  templateUrl: './chamado-relatorio-print.component.html',
  styleUrls: ['./chamado-relatorio-print.component.scss']
})
export class ChamadoRelatorioPrintComponent implements OnInit, OnDestroy {
  carregando = true;

  chamadoID = '';
  chamado!: IChamadoView;

  usuarios: IUsuarioView[] = [];
  departamentos: IDepartamentoResponsavel[] = [];
  servicos: IServico[] = [];
  formasContato: IFormaContato[] = [];
  categorias: ICategoria[] = [];
  clientes: IClienteView[] = [];
  clienteSelecionado: IClienteView | null = null;

  campos: KV[] = [];
  mensagens: MsgPrint[] = [];

  geradoEm = new Date();

  camposChamado: KV[] = [];
  camposCliente: KV[] = [];
  camposProduto: KV[] = [];

  private _gerou = false;

  @ViewChild('pdfArea', { static: false }) pdfArea!: ElementRef<HTMLElement>;

  constructor(
    private route: ActivatedRoute,
    private chamadoService: ChamadoService,
    private usuarioService: UsuarioService,
    private departamentoService: DepartamentoResponsavelService,
    private servicoService: ServicoService,
    private formaContatoService: FormaContatoService,
    private categoriaService: CategoriaService,
    private clienteService: ClienteService,
    private renderer: Renderer2,
    private location: Location
  ) { }

  async ngOnInit(): Promise<void> {
    this.renderer.addClass(document.body, 'print-mode');

    this.chamadoID = this.route.snapshot.paramMap.get('ChamadoID') || '';

    const st: any = history.state;
    if (st?.chamadoID === this.chamadoID && st?.chamado) {
      this.chamado = st.chamado;
      this.usuarios = st.usuarios || [];
      this.departamentos = st.departamentos || [];
      this.servicos = st.servicos || [];
      this.formasContato = st.formasContato || [];
      this.categorias = st.categorias || [];
      this.clientes = st.clientes || [];
    } else {
      await this.carregar();
    }

    this.montarRelatorio();
    this.carregando = false;
  }

  ngOnDestroy(): void {
    this.renderer.removeClass(document.body, 'print-mode');
  }

  async ngAfterViewInit(): Promise<void> {
    // espera o DOM “assentar”
    setTimeout(() => {
      this.gerarPdf(); // baixa direto
    }, 150);
  }

  private async carregar(): Promise<void> {
    const [
      chamado,
      usuarios,
      departamentos,
      servicos,
      formasContato,
      categorias,
      clientes
    ] = await Promise.all([
      firstValueFrom(this.chamadoService.buscarChamado(this.chamadoID)),
      firstValueFrom(this.usuarioService.buscarUsuarios()),
      firstValueFrom(this.departamentoService.buscarDepartamentosResponsaveis()),
      firstValueFrom(this.servicoService.buscarServicos()),
      firstValueFrom(this.formaContatoService.buscarFormasContato()),
      firstValueFrom(this.categoriaService.buscarCategorias()),
      firstValueFrom(this.clienteService.buscarClientes()),
    ]);

    this.chamado = chamado as any;
    this.usuarios = (usuarios || []).filter(u => u.Ativo);
    this.departamentos = departamentos || [];
    this.servicos = servicos || [];
    this.formasContato = formasContato || [];
    this.categorias = categorias || [];
    this.clientes = clientes || [];
  }

  private montarRelatorio(): void {
    const c = this.chamado as any;

    // Cliente selecionado
    this.clienteSelecionado = this.clientes.find(x => x.ClienteID === c?.ClienteID) || null;

    // ===== CHAMADO =====
    this.camposChamado = [
      this.kv('Protocolo', c?.Protocolo),
      this.kv('Título', c?.Titulo),
      //this.kv('Status', c?.Status),
      this.kv('Prioridade', c?.Prioridade),

      this.kv('Aberto por', this.nomeUsuario(c?.UsuarioCriacaoID)),
      this.kv('Data/Hora de abertura', this.formatarDataHora(c?.DataHora)),

      this.kv('Departamento responsável', this.nomeDepartamento(c?.DepartamentoResponsavelID)),
      this.kv('Responsável', this.nomeUsuario(c?.UsuarioResponsavelID)),

      this.kv('Serviço', this.nomeServico(c?.ServicoID)),
      this.kv('Tipo de serviço', this.nomeTipoServico(c?.ServicoID, c?.TipoServicoID)),

      this.kv('Forma de contato', this.nomeFormaContato(c?.FormaContatoID)),
      this.kv('Categoria', this.nomeCategoria(c?.CategoriaID)),

      this.kv('Finalizado por', this.nomeUsuario(c?.UsuarioFinalizacaoID)),
      this.kv('Data/Hora de finalização', this.formatarDataHora(c?.DataHoraFinalizacao)),
      this.kv('Avaliação', c?.PesquisaSatisfacao),
    ].filter(x => x.value !== '');

    // ===== CLIENTE =====
    const cli: any = this.clienteSelecionado;
    this.camposCliente = cli ? [
      this.kv('Nome do Cliente', cli.NomeCliente, true),
      this.kv('Nome fantasia', cli.NomeFantasia, true),
      this.kv('Razão social', cli.RazaoSocial, true),
      this.kv('CNPJ', cli.Cnpj),
      this.kv('Telefone', this.formatTelefoneBR(cli.Telefone)),
      this.kv('E-mail', cli.Email),
      this.kv('Endereço completo', this.enderecoCliente(cli), true),
    ].filter(x => x.value && x.value !== '') : [];

    // ===== PRODUTO (SAC) =====
    this.camposProduto = [
      this.kv('Cliente vinculado', this.nomeCliente(c?.ClienteID), true),
      this.kv('Produto', c?.Produto, true),
      this.kv('Quantidade', c?.QuantidadeProduto ?? c?.Quantidade),
      this.kv('Estado do produto', c?.Estado ?? c?.EstadoProduto),
      this.kv('Lote', c?.LoteProduto ?? c?.Lote),
      this.kv('Fabricação', this.formatarDataBR(c?.Fabricacao)),
      this.kv('Validade', this.formatarDataBR(c?.Validade)),
      this.kv('Hora do envase', this.formatarHora(c?.HoraEnvase)),
      this.kv('Local da compra', c?.LocalCompra, true),
    ].filter(x => x.value !== '');

    // ===== Mensagens =====
    const msgs = (this.chamado?.Mensagens || []) as IMensagemView[];

    this.mensagens = msgs.map(m => {
      const arquivos = (m.Arquivos || []);

      const imagens = arquivos
        .map(a => a.LinkArquivo)
        .filter(u => this.isImageUrl(u));

      return {
        autor: this.nomeUsuario(m.UsuarioID) || '—',
        data: `${this.formatarDataHora(m.DataHoraInicio)} às ${this.formatarDataHora(m.DataHoraFim)}`.trim(),
        texto: (m.Mensagem || '').toString(),
        interna: !!m.Interno,
        imagens,
        arquivos
      };
    });

  }


  // ===== lookups =====
  private nomeUsuario(id?: string | null): string {
    if (!id) return '';
    return this.usuarios.find(u => u.UsuarioID === id)?.Nome || '';
  }

  private nomeDepartamento(id?: string | null): string {
    if (!id) return '';
    return this.departamentos.find(d => d.DepartamentoResponsavelID === id)?.DepartamentoResponsavel || '';
  }

  private nomeServico(servicoId?: string | null): string {
    if (!servicoId) return '';
    return this.servicos.find(s => s.ServicoID === servicoId)?.Servico || '';
  }

  private nomeTipoServico(servicoId?: string | null, tipoId?: string | null): string {
    if (!servicoId || !tipoId) return '';
    const serv = this.servicos.find(s => s.ServicoID === servicoId);
    const tipo = serv?.TipoServico?.find((t: ITipoServico) => t.TipoServicoID === tipoId);
    return tipo?.TipoServico || '';
  }

  private nomeFormaContato(id?: string | null): string {
    if (!id) return '';
    return this.formasContato.find(f => String(f.FormaContatoID) === String(id))?.FormaContato || '';
  }

  private nomeCategoria(id?: string | null): string {
    if (!id) return '';
    return this.categorias.find(x => x.CategoriaID === id)?.Categoria || '';
  }

  private nomeCliente(id?: string | null): string {
    if (!id) return '';
    const cli = this.clientes.find(x => x.ClienteID === id);
    return (cli?.NomeFantasia || cli?.RazaoSocial || '').trim();
  }

  // ===== formatters =====
  private kv(label: string, raw: any, wide = false): KV {
    const v = raw === null || raw === undefined ? '' : String(raw).trim();
    return { label, value: v, wide };
  }


  private formatarDataHora(iso?: string | null): string {
    if (!iso || iso === '0001-01-01T00:00:00') return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} - ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  private formatarDataBR(v?: any): string {
    if (!v) return '';
    const s = String(v);
    // se vier "YYYY-MM-DD..."
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
      const [yyyy, mm, dd] = s.slice(0, 10).split('-');
      return `${dd}/${mm}/${yyyy}`;
    }
    const d = new Date(v);
    if (isNaN(d.getTime())) return '';
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
  }

  private formatarHora(v?: any): string {
    if (!v) return '';
    const s = String(v).trim();
    // "HH:mm:ss" -> "HH:mm"
    if (/^\d{2}:\d{2}:\d{2}$/.test(s)) return s.slice(0, 5);
    if (/^\d{2}:\d{2}$/.test(s)) return s;
    return s;
  }

  private formatCep(cep?: string): string {
    const d = (cep || '').replace(/\D/g, '');
    if (d.length !== 8) return (cep || '').trim() || '';
    return `${d.slice(0, 5)}-${d.slice(5)}`;
  }

  private formatTelefoneBR(tel?: string): string {
    const d = (tel || '').replace(/\D/g, '');
    if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
    if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
    return (tel || '').trim() || '';
  }

  private enderecoCliente(c: any): string {
    if (!c) return '';
    const tipo = (c.TipoLogradouro || '').trim();
    const log = (c.Logradouro || '').trim();
    const num = (c.NumeroLogradouro || '').trim();
    const comp = (c.Complemento || '').trim();
    const bairro = (c.Bairro || '').trim();
    const cidade = (c.Cidade || '').trim();
    const uf = (c.Uf || '').trim();
    const cep = this.formatCep(c.Cep);

    const linha1 = [tipo, log, num].filter(Boolean).join(' ');
    const linha2 = [comp, bairro].filter(Boolean).join(' - ');
    const linha3 = [cidade, uf].filter(Boolean).join(' / ');

    return [linha1, linha2, linha3, cep ? `CEP ${cep}` : '']
      .filter(Boolean)
      .join(' • ');
  }

  private aplicarQuebrasInteligentesA4(container: HTMLElement): void {
    const pageHeightPx = this.getA4PageHeightPx(container);

    const blocks = Array.from(container.querySelectorAll<HTMLElement>('.no-break'));

    blocks.forEach(block => {
      if (block.offsetHeight > pageHeightPx * 0.95) {
        block.classList.remove('no-break');
        block.classList.add('allow-break');
        return;
      }

      const prev = block.previousElementSibling as HTMLElement | null;
      if (prev?.classList?.contains('page-spacer')) prev.remove();

      const top = block.offsetTop;
      const height = block.offsetHeight;

      const pageTop = Math.floor(top / pageHeightPx) * pageHeightPx;
      const pageBottom = pageTop + pageHeightPx;

      if (top + height > pageBottom) {
        const spacerHeight = pageBottom - top;

        const spacer = document.createElement('div');
        spacer.className = 'page-spacer';
        spacer.style.height = `${spacerHeight}px`;

        block.parentElement?.insertBefore(spacer, block);
      }
    });
  }

  private getA4PageHeightPx(container: HTMLElement): number {
    // área útil considerando @page margin: 12mm
    const usableRatio = 273 / 186;

    const width = container.clientWidth || 794;
    return Math.floor(width * usableRatio);
  }

  private async gerarPdf(): Promise<void> {
    document.body.classList.add('pdf-render');

    if (this._gerou) return;
    this._gerou = true;

    const el = this.pdfArea.nativeElement;
    if (!el) return;

    // 1) garante que imgs do HTML carregaram
    await this.waitImages(el);

    // 2) converte todas as imgs remotas para base64 (inline)
    await this.inlineImagesForCanvas(el);

    // 3) depois disso pode aplicar paginação
    this.aplicarQuebrasInteligentesA4(el);

    // 4) agora sim o html2canvas vai “enxergar” as imagens
    const canvas = await html2canvas(el, {
      scale: 2,
      useCORS: true,
      allowTaint: false,
      backgroundColor: '#ffffff',
      imageTimeout: 30000,
      logging: true,
    });

    if (!el) return;

    const imgData = canvas.toDataURL('image/jpeg', 0.95);

    // A4 em mm
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = 210;
    const pageHeight = 297;

    // converte px -> mm proporcionalmente pela largura
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    // primeira página
    pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    // próximas páginas (paginação automática)
    while (heightLeft > 0) {
      position -= pageHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    const nome = `Chamado_${this.chamado?.Protocolo || this.chamadoID}.pdf`;
    pdf.save(nome);

    document.body.classList.remove('pdf-render');

    setTimeout(() => {
      this.location.back();
    }, 200);
  }

  private isImageUrl(url: string): boolean {
    const u = (url || '').toLowerCase().split('?')[0]; // remove querystring
    return (
      u.endsWith('.png') ||
      u.endsWith('.jpg') ||
      u.endsWith('.jpeg') ||
      u.endsWith('.webp') ||
      u.endsWith('.gif')
    );
  }

  onImgError(ev: Event) {
    const img = ev.target as HTMLImageElement;
    img.style.display = 'none';
  }

  private async waitImages(container: HTMLElement): Promise<void> {
    const imgs = Array.from(container.querySelectorAll('img')) as HTMLImageElement[];

    await Promise.all(imgs.map(img => {
      if (img.complete && img.naturalWidth > 0) return Promise.resolve();
      return new Promise<void>(resolve => {
        const done = () => resolve();
        img.addEventListener('load', done, { once: true });
        img.addEventListener('error', done, { once: true });
      });
    }));
  }

  private async inlineImagesForCanvas(container: HTMLElement): Promise<void> {
    const imgs = Array.from(container.querySelectorAll('img')) as HTMLImageElement[];

    await Promise.all(imgs.map(async (img) => {
      const src = img.getAttribute('src') || '';
      if (!src || src.startsWith('data:')) return;

      try {
        const dataUrl = await this.urlToDataUrl(src);
        img.setAttribute('src', dataUrl);
      } catch (e) {
        console.error('[INLINE IMG FAIL]', src, e);
      }
    }));

    await this.waitImages(container);
  }

  private async urlToDataUrl(url: string): Promise<string> {
    const resp = await fetch(url, {
      credentials: 'include', // manda cookie
      cache: 'no-cache',
    });

    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

    const blob = await resp.blob();

    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

}
