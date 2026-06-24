import * as FAIcons from 'react-icons/fa6';

const NAV_ICON_MAP: Record<string, keyof typeof FAIcons> = {
  'fa-truck': 'FaTruck',
  'fa-box-open': 'FaBoxOpen',
  'fa-circle-check': 'FaCircleCheck',
  'fa-boxes-stacked': 'FaBoxesStacked',
  'fa-file-circle-xmark': 'FaFileCircleXmark',
  'fa-truck-ramp-box': 'FaTruckRampBox',
  'fa-box': 'FaBox',
  'fa-door-open': 'FaDoorOpen',
  'fa-lemon': 'FaLemon',
  'fa-paper-plane': 'FaPaperPlane',
  'fa-clock': 'FaClock',
  'fa-id-card': 'FaIdCard',
  'fa-user-pen': 'FaUserPen',
  'fa-users': 'FaUsers',
  'fa-user-check': 'FaUserCheck',
  'fa-user-slash': 'FaUserSlash',
  'fa-envelope': 'FaEnvelope',
  'fa-inbox': 'FaInbox',
  'fa-envelope-open-text': 'FaEnvelopeOpenText',
  'fa-sliders': 'FaSliders',
  'fa-globe': 'FaGlobe',
  'fa-palette': 'FaPalette',
  'fa-cog': 'FaGear',
  'fa-calendar': 'FaCalendar',
  'fa-grip': 'FaGripVertical',
  'fa-handshake': 'FaHandshake',
  'fa-tag': 'FaTag',
  'fa-bookmark': 'FaBookmark',
  'fa-hand': 'FaPersonRays',
  'fa-leaf': 'FaLeaf',
  'fa-money-bill': 'FaMoneyBill',
  'fa-person': 'FaPerson',
  'fa-chart-bar': 'FaChartBar',
  'fa-list': 'FaList',
  'fa-trash': 'FaTrash',
};

export function resolveNavigationIcon(iconKey?: string) {
  if (!iconKey) {
    return null;
  }

  const mappedIcon = NAV_ICON_MAP[iconKey];
  return mappedIcon ? FAIcons[mappedIcon] : null;
}