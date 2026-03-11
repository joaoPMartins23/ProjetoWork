import { Component, OnInit } from '@angular/core';
import { formatRelative, formatDistanceToNowStrict, isToday, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import * as CryptoJS from 'crypto-js';
import { environment } from 'src/environments/environment';

import { INotificacaoView } from 'src/app/modules/notificacao.interface';
import { NotificacaoService } from 'src/app/services/notificacao.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-notificacao',
  templateUrl: './notificacao.component.html',
  styleUrl: './notificacao.component.scss'
})
export class NotificacaoComponent implements OnInit {
  protected usuarioIDArmazenado = localStorage.getItem('UsuarioID');
  protected usuarioID: string = this.usuarioIDArmazenado
    ? CryptoJS.AES.decrypt(this.usuarioIDArmazenado, environment.chavePrivada).toString(CryptoJS.enc.Utf8)
    : '';

  protected dropdownAberto: boolean = false;
  protected notificacoes: INotificacaoView[] = [];
  private intervalo!: ReturnType<typeof setInterval>;

  constructor(
    private notificacaoService: NotificacaoService,
    private router: Router,
  ) { }

  async ngOnInit(): Promise<void> {
    await this.carregarNotificacoes();

    this.intervalo = setInterval(() => {
      this.carregarNotificacoes();
    }, 120000); // 5 minutos
  }

  ngOnDestroy(): void {
    clearInterval(this.intervalo); // limpa o intervalo ao destruir o componente
  }

  protected async carregarNotificacoes(): Promise<void> {
    this.notificacoes = [];

    try {
      const resultado = await this.notificacaoService
        .buscarNotificacoesPorUsuario(this.usuarioID)
        .toPromise() || [];

      // Ordena por data decrescente (mais recente primeiro)
      this.notificacoes = resultado.sort((a, b) =>
        new Date(b.DataHoraCriacao).getTime() - new Date(a.DataHoraCriacao).getTime()
      );
    } catch (err) {
      console.error('Erro ao buscar notificações', err);
    }
  }


  protected tempoFormatado(data: string | Date): string {
    try {
      const dataConvertida: Date = typeof data === 'string' ? parseISO(data) : data;

      if (isToday(dataConvertida)) {
        return `Há ${formatDistanceToNowStrict(dataConvertida, { locale: ptBR })}`;
      } else {
        return formatRelative(dataConvertida, new Date(), { locale: ptBR });
      }
    } catch {
      return '';
    }
  }

  protected alternarDropdown() {
    this.dropdownAberto = !this.dropdownAberto;
  }

  protected fecharDropdown() {
    setTimeout(() => {
      this.dropdownAberto = false;
    }, 200);
  }

  protected verificarIconeNotificacao(mensagem: string): string {
    mensagem = mensagem.toLowerCase();

    if (mensagem.includes('mensagem')) return 'fa fa-comment';
    if (mensagem.includes('atribuído')) return 'fa fa-plus';
    if (mensagem.includes('atualizado')) return 'fa fa-pencil';
    if (mensagem.includes('cancelado')) return 'fa fa-trash';
    if (mensagem.includes('finalizado')) return 'fa fa-check';

    return 'fa fa-bell';
  }

  protected navegarNotificacao(notificacaoID: string, url: string): void {
    this.notificacaoService.marcarNotificacaoComoLida(notificacaoID).subscribe(() => {
      this.carregarNotificacoes();
      this.router.navigate([url]);
      this.dropdownAberto = false;
    });
  }

  get quantidade(): number {
    return this.notificacoes.filter(n => !n.Lida).length;
  }

  protected limparTodasNotificacoes(): void {
    if (this.notificacoes.length === 0) return;

    this.notificacaoService.marcarTodasNotificacoesUsuarioComoLidas(this.usuarioID).subscribe(() => {
      this.carregarNotificacoes();
    });
  }
}

