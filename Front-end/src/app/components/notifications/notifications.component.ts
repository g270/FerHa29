import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AppNotification } from '../../models/models';
import { NotificationService } from '../../services/index';

@Component({
  selector: 'app-notifications',
  styleUrls: ['./notifications.component.css'],
  template: `
    <section class="notifications-page">
      <div class="page-header card">
        <div>
          <p class="eyebrow">Centro de actividad</p>
          <h1>Notificaciones</h1>
          <p class="subtitle">Revisa cambios en tus solicitudes y mantén trazabilidad de las respuestas del otro lado.</p>
        </div>
        <button type="button" class="mark-all" (click)="markAllAsRead()" [disabled]="loading || notifications.length === 0 || unreadCount === 0">
          Marcar todo como leído
        </button>
      </div>

      <div class="state" *ngIf="loading">Cargando notificaciones...</div>
      <div class="state error" *ngIf="error">{{ error }}</div>

      <div class="notification-list" *ngIf="!loading && notifications.length > 0">
        <article class="notification-card card" *ngFor="let notification of notifications" [class.unread]="!notification.isRead">
          <div class="notification-head">
            <div>
              <h2>{{ notification.title }}</h2>
              <p class="notification-date">{{ notification.createdAt | date:'medium' }}</p>
            </div>
            <span class="unread-pill" *ngIf="!notification.isRead">Nueva</span>
          </div>

          <p class="notification-message">{{ notification.message }}</p>

          <div class="notification-actions">
            <button type="button" class="open-link" (click)="openNotification(notification)">
              Ver detalle
            </button>
            <button type="button" class="mark-one" *ngIf="!notification.isRead" (click)="markAsRead(notification)">
              Marcar como leída
            </button>
          </div>
        </article>
      </div>

      <div class="empty-panel card" *ngIf="!loading && notifications.length === 0">
        <p>No tienes notificaciones por ahora.</p>
      </div>
    </section>
  `
})
export class NotificationsComponent implements OnInit {
  notifications: AppNotification[] = [];
  unreadCount = 0;
  loading = true;
  error = '';

  constructor(private notificationService: NotificationService, private router: Router) {}

  ngOnInit(): void {
    this.loadNotifications();
  }

  loadNotifications(): void {
    this.loading = true;
    this.error = '';

    this.notificationService.getNotifications(50).subscribe({
      next: (response) => {
        this.notifications = response.items;
        this.unreadCount = response.unreadCount;
        this.loading = false;
      },
      error: (err: { error?: { message?: string } }) => {
        this.error = err.error?.message || 'No se pudieron cargar las notificaciones.';
        this.loading = false;
      }
    });
  }

  markAsRead(notification: AppNotification): void {
    this.notificationService.markAsRead(notification.id).subscribe({
      next: (updated) => {
        this.notifications = this.notifications.map((item) => item.id === updated.id ? updated : item);
        this.unreadCount = this.notifications.filter((item) => !item.isRead).length;
      },
      error: () => {
        this.error = 'No se pudo actualizar la notificación.';
      }
    });
  }

  markAllAsRead(): void {
    this.notificationService.markAllAsRead().subscribe({
      next: () => {
        this.notifications = this.notifications.map((item) => ({ ...item, isRead: true }));
        this.unreadCount = 0;
      },
      error: () => {
        this.error = 'No se pudieron marcar las notificaciones como leídas.';
      }
    });
  }

  openNotification(notification: AppNotification): void {
    if (notification.isRead) {
      this.router.navigateByUrl(notification.link || '/service-requests');
      return;
    }

    this.notificationService.markAsRead(notification.id).subscribe({
      next: () => {
        this.notifications = this.notifications.map((item) => item.id === notification.id ? { ...item, isRead: true } : item);
        this.unreadCount = this.notifications.filter((item) => !item.isRead).length;
        this.router.navigateByUrl(notification.link || '/service-requests');
      },
      error: () => {
        this.error = 'No se pudo abrir la notificación.';
      }
    });
  }
}