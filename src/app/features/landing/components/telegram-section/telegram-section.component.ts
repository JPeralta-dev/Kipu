import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import { FtSubtleRevealDirective } from '../../../../shared/directives/ft-subtle-reveal.directive';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';
import { environment } from '../../../../../environments/environment';

export interface RegistrationMethod {
  id: string;
  number: string;
  title: string;
  badge?: string;
  icon: string;
  description: string;
}

@Component({
  selector: 'ft-telegram-section',
  standalone: true,
  imports: [CommonModule, RouterLink, NgIcon, FtSubtleRevealDirective, TranslatePipe],
  templateUrl: './telegram-section.component.html',
  styleUrl: './telegram-section.component.scss',
})
export class TelegramSectionComponent {
  readonly telegramBotUrl = environment.telegramBotUrl;
  readonly activeMethod = signal<number>(0);

  readonly methods: RegistrationMethod[] = [
    {
      id: 'telegram',
      number: '01',
      title: 'KipuBot en Telegram',
      badge: 'El más rápido · 3 seg',
      icon: 'telegram',
      description:
        'Envía un mensaje rápido como "Cena con amigos $24" o una nota de voz. KipuBot detecta el importe, la fecha y la categoría automáticamente.',
    },
    {
      id: 'manual',
      number: '02',
      title: 'A mano en la app',
      icon: 'plus',
      description:
        'Cambia entre gasto o ingreso con un toque. Categorías inmediatas, sin formularios eternos ni campos obligatorios molestos.',
    },
    {
      id: 'bank-import',
      number: '03',
      title: 'Extracto Bancario Seguro',
      icon: 'documentArrowDown',
      description:
        'Arrastra tu extracto en CSV o Excel (.xlsx). Detecta duplicados automáticamente sin comprometer tus contraseñas bancarias.',
    },
  ];
}
