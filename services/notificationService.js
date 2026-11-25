// services/notificationService.js
// KisanSAATHI - Real-Time Agricultural Notifications & Alerts Service

import AsyncStorage from '@react-native-async-storage/async-storage';

const NOTIFICATIONS_STORAGE_KEY = '@kisansaathi_notifications_v1';

export const INITIAL_NOTIFICATIONS = [
  {
    id: 'notif_1',
    type: 'mandi',
    category: 'Mandi Alert',
    categoryHi: 'मंडी भाव अलर्ट',
    title: 'Soybean Mandi Surge (+₹120/Q)',
    titleHi: 'सोयाबीन भाव में उछाल (+₹120/Q)',
    message: 'Indore APMC modal rate touched ₹5,150/quintal today. Standard FAQ yellow soybean is in high demand.',
    messageHi: 'इंदौर मंडी में सोयाबीन का मॉडल भाव आज ₹5,150/क्विंटल पहुंचा। बेचने का अनुकूल समय है।',
    time: '15 mins ago',
    timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    isRead: false,
    priority: 'high',
    actionRoute: 'Market',
    actionLabel: 'View Mandi Rates',
    actionLabelHi: 'मंडी भाव देखें',
    icon: 'trending-up',
    iconColor: '#2E7D32',
  },
  {
    id: 'notif_2',
    type: 'b2c',
    category: 'Kisan Direct Deal',
    categoryHi: 'ग्राहक सीधी पूछताछ',
    title: 'New B2C Purchase Inquiry (1 Quintal)',
    titleHi: 'नई ग्राहक पूछताछ (1 क्विंटल)',
    message: 'Amit Sharma sent an inquiry to purchase 1 Quintal (100 kg) Sharbati Wheat with farm gate pickup.',
    messageHi: 'अमित शर्मा ने 1 क्विंटल (100 kg) शरबती गेहूं के लिए पूछताछ भेजी है। सीधी चैट करें।',
    time: '1 hour ago',
    timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    isRead: false,
    priority: 'high',
    actionRoute: 'B2CChatsList',
    actionLabel: 'Open Chat',
    actionLabelHi: 'चैट खोलें',
    icon: 'handshake',
    iconColor: '#E65100',
  },
  {
    id: 'notif_3',
    type: 'weather',
    category: 'Weather Risk',
    categoryHi: 'मौसम एवं छिड़काव चेतावनी',
    title: 'Unfavorable Spraying Conditions',
    titleHi: 'कीटनाशक छिड़काव से बचें',
    message: 'High wind velocity (24 km/h) and relative humidity > 78% detected. Postpone foliar spraying to prevent drift and wash-off.',
    messageHi: 'तेज हवा और नमी के कारण आज कीटनाशक छिड़काव टालें। कल सुबह का मौसम अनुकूल रहेगा।',
    time: '3 hours ago',
    timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    isRead: false,
    priority: 'urgent',
    actionRoute: null,
    actionLabel: null,
    icon: 'weather-windy',
    iconColor: '#C62828',
  },
  {
    id: 'notif_4',
    type: 'scheme',
    category: 'Government Scheme',
    categoryHi: 'सरकारी योजना अपडेट',
    title: 'PM-Kisan 19th Installment Released',
    titleHi: 'पीएम किसान 19वीं किस्त जारी',
    message: 'DBT transfer of ₹2,000 processed for registered landholders. Check e-KYC and beneficiary bank status.',
    messageHi: 'पात्र किसानों के खातों में ₹2,000 की किस्त अंतरित की गई। स्टेटस चेक करें।',
    time: 'Yesterday',
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    isRead: true,
    priority: 'normal',
    actionRoute: 'Chat',
    actionLabel: 'Ask Krishi Sahayak',
    actionLabelHi: 'कृषि सहायक से पूछें',
    icon: 'bank',
    iconColor: '#1565C0',
  },
  {
    id: 'notif_5',
    type: 'advisory',
    category: 'Crop Intelligence',
    categoryHi: 'फसल एवं सिंचाई सलाह',
    title: 'Soil Moisture Optimal for Wheat',
    titleHi: 'गेहूं के लिए मृदा नमी पर्याप्त',
    message: 'Subsurface loam moisture is at 62%. No irrigation needed for the next 48 hours to conserve electricity.',
    messageHi: 'खेत में नमी पर्याप्त है। अगले 48 घंटों तक सिंचाई की आवश्यकता नहीं है।',
    time: '2 days ago',
    timestamp: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    isRead: true,
    priority: 'normal',
    actionRoute: null,
    actionLabel: null,
    icon: 'water-check',
    iconColor: '#00838F',
  },
];

/**
 * Retrieve all notifications
 */
export async function getNotifications() {
  try {
    const raw = await AsyncStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    if (!raw) {
      await AsyncStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(INITIAL_NOTIFICATIONS));
      return INITIAL_NOTIFICATIONS;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error('getNotifications error:', err);
    return INITIAL_NOTIFICATIONS;
  }
}

/**
 * Mark a single notification as read
 */
export async function markNotificationAsRead(id) {
  try {
    const list = await getNotifications();
    const updated = list.map((item) => (item.id === id ? { ...item, isRead: true } : item));
    await AsyncStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.error('markNotificationAsRead error:', err);
    return [];
  }
}

/**
 * Mark all notifications as read
 */
export async function markAllNotificationsAsRead() {
  try {
    const list = await getNotifications();
    const updated = list.map((item) => ({ ...item, isRead: true }));
    await AsyncStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.error('markAllNotificationsAsRead error:', err);
    return [];
  }
}

/**
 * Delete a notification
 */
export async function deleteNotification(id) {
  try {
    const list = await getNotifications();
    const updated = list.filter((item) => item.id !== id);
    await AsyncStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.error('deleteNotification error:', err);
    return [];
  }
}

/**
 * Get count of unread notifications
 */
export async function getUnreadCount() {
  try {
    const list = await getNotifications();
    return list.filter((n) => !n.isRead).length;
  } catch (err) {
    return 0;
  }
}
