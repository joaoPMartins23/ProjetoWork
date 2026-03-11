import { Component, OnInit } from '@angular/core';
import { MensagemService } from 'src/app/services/mensagem.service';

@Component({
  selector: 'app-mensagem',
  templateUrl: './mensagem.component.html',
  styleUrl: './mensagem.component.scss'
})
export class MensagemComponent implements OnInit {

  constructor(protected mensagemService: MensagemService) { }

  ngOnInit(): void {
  }

}
