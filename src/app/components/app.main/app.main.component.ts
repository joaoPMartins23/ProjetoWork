import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-app.main',
  templateUrl: './app.main.component.html',
  styleUrl: './app.main.component.scss'
})
export class AppMainComponent implements OnInit {
  public menuFechado = true;

  constructor(
  ) {}

  ngOnInit(): void {
  }
}
