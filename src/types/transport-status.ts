/**
 * Gestion complète des statuts de transport
 */

export type TransportStatus =
  | 'pending'           // En attente d'un chauffeur
  | 'accepted'          // Accepté par un chauffeur
  | 'heading_to_pickup' // En route vers le point de retrait
  | 'arrived_at_pickup' // Arrivé au point de retrait
  | 'loading'           // Chargement en cours
  | 'in_transit'        // En route vers la livraison
  | 'arrived_at_delivery' // Arrivé au point de livraison
  | 'unloading'         // Déchargement en cours
  | 'completed'         // Livraison terminée
  | 'cancelled';        // Annulé

export interface StatusInfo {
  status: TransportStatus;
  label: string;
  description: string;
  color: string;
  icon: string;
  canTransitionTo: TransportStatus[];
  requiresPhoto?: boolean;
  requiresSignature?: boolean;
}

/**
 * Configuration complète du workflow de statuts
 */
export const TRANSPORT_STATUS_CONFIG: Record<TransportStatus, StatusInfo> = {
  pending: {
    status: 'pending',
    label: 'En attente',
    description: 'En attente d\'attribution à un chauffeur',
    color: '#FFA500',
    icon: 'clock-outline',
    canTransitionTo: ['accepted', 'cancelled'],
  },
  accepted: {
    status: 'accepted',
    label: 'Accepté',
    description: 'Accepté par le chauffeur',
    color: '#4CAF50',
    icon: 'check-circle',
    canTransitionTo: ['heading_to_pickup', 'cancelled'],
  },
  heading_to_pickup: {
    status: 'heading_to_pickup',
    label: 'En route vers retrait',
    description: 'Le chauffeur se dirige vers le point de retrait',
    color: '#2196F3',
    icon: 'truck-fast',
    canTransitionTo: ['arrived_at_pickup', 'cancelled'],
  },
  arrived_at_pickup: {
    status: 'arrived_at_pickup',
    label: 'Arrivé au retrait',
    description: 'Le chauffeur est arrivé au point de retrait',
    color: '#9C27B0',
    icon: 'map-marker-check',
    canTransitionTo: ['loading', 'cancelled'],
  },
  loading: {
    status: 'loading',
    label: 'Chargement en cours',
    description: 'Chargement des articles dans le véhicule',
    color: '#FF9800',
    icon: 'package-variant',
    canTransitionTo: ['in_transit', 'cancelled'],
    requiresPhoto: true,
  },
  in_transit: {
    status: 'in_transit',
    label: 'En transit',
    description: 'En route vers le point de livraison',
    color: '#00BCD4',
    icon: 'truck-delivery',
    canTransitionTo: ['arrived_at_delivery', 'cancelled'],
  },
  arrived_at_delivery: {
    status: 'arrived_at_delivery',
    label: 'Arrivé à la livraison',
    description: 'Le chauffeur est arrivé au point de livraison',
    color: '#673AB7',
    icon: 'home-map-marker',
    canTransitionTo: ['unloading', 'cancelled'],
  },
  unloading: {
    status: 'unloading',
    label: 'Déchargement en cours',
    description: 'Déchargement des articles',
    color: '#E91E63',
    icon: 'package-down',
    canTransitionTo: ['completed', 'cancelled'],
  },
  completed: {
    status: 'completed',
    label: 'Terminé',
    description: 'Livraison terminée avec succès',
    color: '#4CAF50',
    icon: 'check-circle',
    canTransitionTo: [],
    requiresPhoto: true,
    requiresSignature: true,
  },
  cancelled: {
    status: 'cancelled',
    label: 'Annulé',
    description: 'Transport annulé',
    color: '#F44336',
    icon: 'close-circle',
    canTransitionTo: [],
  },
};

/**
 * Actions disponibles pour le chauffeur selon le statut
 */
export interface StatusAction {
  label: string;
  nextStatus: TransportStatus;
  color: string;
  icon: string;
  requiresConfirmation?: boolean;
  confirmationMessage?: string;
}

export const getDriverActions = (currentStatus: TransportStatus): StatusAction[] => {
  // Map direct depuis le statut actuel vers l'action principale (pas les destinations)
  const actionMap: Record<TransportStatus, StatusAction> = {
    pending: {
      label: 'Accepter',
      nextStatus: 'accepted',
      color: '#4CAF50',
      icon: 'check',
    },
    accepted: {
      label: 'Démarrer le trajet',
      nextStatus: 'heading_to_pickup',
      color: '#2196F3',
      icon: 'navigation',
    },
    heading_to_pickup: {
      label: 'Je suis arrivé',
      nextStatus: 'arrived_at_pickup',
      color: '#9C27B0',
      icon: 'map-marker-check',
    },
    arrived_at_pickup: {
      label: 'Commencer le chargement',
      nextStatus: 'loading',
      color: '#FF9800',
      icon: 'package-variant-closed',
    },
    loading: {
      label: 'Chargement terminé',
      nextStatus: 'in_transit',
      color: '#00BCD4',
      icon: 'truck-delivery',
      requiresConfirmation: true,
      confirmationMessage: 'Avez-vous pris des photos du chargement ?',
    },
    in_transit: {
      label: 'Arrivé à destination',
      nextStatus: 'arrived_at_delivery',
      color: '#673AB7',
      icon: 'home-map-marker',
    },
    arrived_at_delivery: {
      label: 'Commencer le déchargement',
      nextStatus: 'unloading',
      color: '#E91E63',
      icon: 'package-down',
    },
    unloading: {
      label: 'Terminer la livraison',
      nextStatus: 'completed',
      color: '#4CAF50',
      icon: 'check-circle',
      requiresConfirmation: true,
      confirmationMessage: 'Avez-vous pris des photos et obtenu la signature du client ?',
    },
    completed: {
      label: '',
      nextStatus: 'completed',
      color: '',
      icon: '',
    },
    cancelled: {
      label: '',
      nextStatus: 'cancelled',
      color: '',
      icon: '',
    },
  };

  const action = actionMap[currentStatus];

  // Ne retourner l'action que si elle existe et a un label
  if (action && action.label) {
    return [action];
  }

  return [];
};

/**
 * Vérifier si une transition est valide
 */
export const canTransitionTo = (from: TransportStatus, to: TransportStatus): boolean => {
  const config = TRANSPORT_STATUS_CONFIG[from];
  return config.canTransitionTo.includes(to);
};

/**
 * Obtenir le statut suivant logique
 */
export const getNextStatus = (current: TransportStatus): TransportStatus | null => {
  const config = TRANSPORT_STATUS_CONFIG[current];
  return config.canTransitionTo[0] || null;
};
