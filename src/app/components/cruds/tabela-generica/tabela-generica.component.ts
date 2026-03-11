import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-tabela-generica',
  templateUrl: './tabela-generica.component.html',
  styleUrl: './tabela-generica.component.scss'
})
export class TabelaGenericaComponent implements OnInit, OnChanges {
  @Input() cabecalhos: any[] = [];
  @Input() cabecalhosEditados: any[] = [];
  @Input() dados: any[] = [];

  protected paginaAtual: number = 1;
  protected itensPorPagina: number = 15;

  protected dadosFiltrados: any[] = [];
  protected termoPesquisa: string = '';

  protected sortIndex: number | null = null;
  protected sortAsc = true;

  // ordem customizada para Status
  private ordemStatus: Record<string, number> = {
    'Em espera': 1,
    'Em andamento': 2,  // ajuste conforme seus nomes reais
    'Pendente': 3,
    'Finalizado': 4
  };

  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
  ) { }

  ngOnInit(): void { }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['dados'] && this.dados) {
      this.dadosFiltrados = [...this.dados];
      // re-aplica ordenação atual (se houver) ao trocar dados
      if (this.sortIndex !== null) this.aplicarOrdenacao();
    }
  }

  protected pesquisar(): void {
    const termo = this.termoPesquisa.toLowerCase();

    this.paginaAtual = 1;

    this.dadosFiltrados = this.dados.filter(item =>
      Object.keys(item).some(key => {
        if (key.toLowerCase() === 'id') return false;
        const valor = String(item[key] ?? '').toLowerCase();
        return valor.includes(termo);
      })
    );

    // mantém a ordenação depois de filtrar
    if (this.sortIndex !== null) this.aplicarOrdenacao();
  }

  protected navegarNovoObjeto(): void {
    const url = this.activatedRoute.snapshot.url.map(segment => segment.path).join('/');
    this.router.navigate([`/${url}/Novo`]);
  }

  protected navegarEditarObjeto(id: number): void {
    const url = this.activatedRoute.snapshot.url.map(segment => segment.path).join('/');
    this.router.navigate([`/${url}/Editar/${id}`]);
  }

  // pega a "chave" usada na linha a partir do índice do cabeçalho
  private getFieldKeyByIndex(i: number): string {
    // usa o espelho cabecalhosEditados para achar o campo em 'dados'
    return this.cabecalhosEditados?.[i]?.CampoTitulo ?? this.cabecalhos?.[i]?.CampoTitulo ?? '';
  }

  protected ordenarPor(i: number): void {
    if (this.sortIndex === i) {
      // mesmo cabeçalho: inverte direção
      this.sortAsc = !this.sortAsc;
    } else {
      // novo cabeçalho: define asc por padrão
      this.sortIndex = i;
      this.sortAsc = true;
    }
    this.aplicarOrdenacao();
  }

  private aplicarOrdenacao(): void {
    if (this.sortIndex === null) return;

    const key = this.getFieldKeyByIndex(this.sortIndex);
    if (!key) return;

    const dir = this.sortAsc ? 1 : -1;

    // collator p/ strings PT-BR (ordenação mais natural)
    const collator = new Intl.Collator('pt-BR', { numeric: true, sensitivity: 'base' });

    const toNumber = (v: any) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : NaN;
    };

    const maybeDate = (v: any) => {
      const t = Date.parse(v);
      return Number.isFinite(t) ? t : NaN;
    };

    this.dadosFiltrados = [...this.dadosFiltrados].sort((a, b) => {
      const va = a?.[key];
      const vb = b?.[key];

      // 1) prioridade: Status com ordem customizada
      if (key.toLowerCase() === 'status') {
        const pa = this.ordemStatus[String(va)] ?? 999;
        const pb = this.ordemStatus[String(vb)] ?? 999;
        if (pa !== pb) return (pa - pb) * dir;
        // tie-break por Data, se existir
        const da = maybeDate(a?.DataHora ?? a?.DataAbertura ?? a?.Data ?? '');
        const db = maybeDate(b?.DataHora ?? b?.DataAbertura ?? b?.Data ?? '');
        if (Number.isFinite(da) && Number.isFinite(db)) return (da - db) * -dir; // mais recente primeiro
        // fallback continua…
      }

      // 2) datas (quando o campo parece data)
      const da = maybeDate(va);
      const db = maybeDate(vb);
      if (Number.isFinite(da) && Number.isFinite(db)) {
        return (da - db) * dir;
      }

      // 3) números
      const na = toNumber(va);
      const nb = toNumber(vb);
      if (Number.isFinite(na) && Number.isFinite(nb)) {
        return (na - nb) * dir;
      }

      // 4) strings (default)
      const sa = (va ?? '').toString();
      const sb = (vb ?? '').toString();
      return collator.compare(sa, sb) * dir;
    });
  }
}
