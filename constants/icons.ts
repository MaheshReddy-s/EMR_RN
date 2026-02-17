import { Platform } from 'react-native';

/**
 * Icon library types supported in this project.
 * Add more as needed (e.g., 'FontAwesome', 'Feather').
 */
export type IconLibrary = 'Ionicons' | 'MaterialIcons' | 'MaterialCommunityIcons' | 'SFSymbols';

/**
 * Represents a single icon definition with platform-specific names and libraries.
 * - `library`: primary library (used for Android or if iosLibrary is missing)
 * - `iosLibrary`: (optional) use a different library for iOS (e.g., 'SFSymbols')
 * - `ios`: icon name for iOS
 * - `android`: icon name for Android
 */
export interface IconDef {
    library: IconLibrary;
    iosLibrary?: IconLibrary;
    ios: string;
    android: string;
}

/**
 * Helper to resolve the correct icon name for the current platform.
 */
export function getIconName(icon: IconDef): string {
    return Platform.OS === 'ios' ? icon.ios : icon.android;
}

// ─────────────────────────────────────────────
// Consultation Screen Icons
// ─────────────────────────────────────────────
export const CONSULTATION_ICONS = {
    /** Trash / delete icon for section rows */
    trashOutline: {
        library: 'Ionicons',
        iosLibrary: 'SFSymbols',
        ios: 'trash',
        android: 'trash-outline',
    } as IconDef,

    /** Add icon (used in suggestion area & input area) */
    add: {
        library: 'Ionicons',
        iosLibrary: 'SFSymbols',
        ios: 'plus',
        android: 'add',
    } as IconDef,


    /** Brush / drawing toggle icon */
    brush: {
        library: 'Ionicons',
        iosLibrary: 'SFSymbols',
        ios: 'paintbrush',
        android: 'brush',
    } as IconDef,

    /** Pencil / edit icon */
    pencil: {
        library: 'Ionicons',
        iosLibrary: 'SFSymbols',
        ios: 'pencil',
        android: 'pencil',
    } as IconDef,

    /** Backspace / clear text icon */
    backspaceOutline: {
        library: 'Ionicons',
        iosLibrary: 'SFSymbols',
        ios: 'delete.left',
        android: 'backspace-outline',
    } as IconDef,
};

// ─────────────────────────────────────────────
// Prescription Row Layout Icons
// ─────────────────────────────────────────────
export const PRESCRIPTION_ROW_ICONS = {
    /** Edit icon - matches pencil.circle in Swift */
    edit: {
        library: 'MaterialIcons',
        iosLibrary: 'SFSymbols',
        ios: 'pencil.circle',
        android: 'edit',
    } as IconDef,

    /** Clear / Reset icon - matches paintbrush in Swift */
    clear: {
        library: 'MaterialIcons',
        iosLibrary: 'SFSymbols',
        ios: 'paintbrush',
        android: 'refresh',
    } as IconDef,

    /** Expand / Manual expansion icon - matches pencil.tip.crop.circle.badge.plus in Swift */
    expand: {
        library: 'MaterialIcons',
        iosLibrary: 'SFSymbols',
        ios: 'pencil.tip.crop.circle.badge.plus',
        android: 'unfold-more',
    } as IconDef,

    /** Delete icon - matches trash.circle in Swift */
    delete: {
        library: 'MaterialIcons',
        iosLibrary: 'SFSymbols',
        ios: 'trash.circle',
        android: 'delete',
    } as IconDef,
};

// ─────────────────────────────────────────────
// Consultation Header Icons
// ─────────────────────────────────────────────
export const HEADER_ICONS = {
    /** Back chevron */
    chevronBack: {
        library: 'Ionicons',
        iosLibrary: 'SFSymbols',
        ios: 'chevron.left',
        android: 'chevron-back',
    } as IconDef,

    /** Play / next circle */
    playCircleOutline: {
        library: 'Ionicons',
        iosLibrary: 'SFSymbols',
        ios: 'play.circle',
        android: 'play-circle-outline',
    } as IconDef,

    /** History icon */
    history: {
        library: 'MaterialCommunityIcons',
        iosLibrary: 'SFSymbols',
        ios: 'clock.arrow.circlepath',
        android: 'history',
    } as IconDef,

    /** Photographs icon */
    photographs: {
        library: 'MaterialCommunityIcons',
        iosLibrary: 'SFSymbols',
        ios: 'photo.on.rectangle',
        android: 'image-multiple',
    } as IconDef,

    /** Lab Reports icon */
    labReports: {
        library: 'MaterialCommunityIcons',
        iosLibrary: 'SFSymbols',
        ios: 'doc.text.below.ecg',
        android: 'file-document-outline',
    } as IconDef,
};

// ─────────────────────────────────────────────
// Follow-Up Modal Icons
// ─────────────────────────────────────────────
export const FOLLOW_UP_ICONS = {
    /** Navigate month backward */
    chevronBack: {
        library: 'Ionicons',
        iosLibrary: 'SFSymbols',
        ios: 'chevron.left',
        android: 'chevron-back',
    } as IconDef,

    /** Navigate month forward */
    chevronForward: {
        library: 'Ionicons',
        iosLibrary: 'SFSymbols',
        ios: 'chevron.right',
        android: 'chevron-forward',
    } as IconDef,
};

// ─────────────────────────────────────────────
// PDF Filter Modal Icons
// ─────────────────────────────────────────────
export const PDF_FILTER_ICONS = {
    /** Close modal */
    close: {
        library: 'Ionicons',
        iosLibrary: 'SFSymbols',
        ios: 'xmark',
        android: 'close',
    } as IconDef,

    /** Section enabled checkmark */
    checkmark: {
        library: 'Ionicons',
        iosLibrary: 'SFSymbols',
        ios: 'checkmark',
        android: 'checkmark',
    } as IconDef,

    /** Section add icon (unchecked) */
    add: {
        library: 'Ionicons',
        iosLibrary: 'SFSymbols',
        ios: 'plus',
        android: 'add',
    } as IconDef,

    /** Check circle (toggle checked) */
    checkCircle: {
        library: 'MaterialIcons',
        iosLibrary: 'SFSymbols',
        ios: 'largecircle.fill.circle',
        android: 'check-circle',
    } as IconDef,

    /** Radio unchecked (toggle unchecked) */
    radioUnchecked: {
        library: 'MaterialIcons',
        iosLibrary: 'SFSymbols',
        ios: 'circle',
        android: 'radio-button-unchecked',
    } as IconDef,

    /** Patient info icon */
    personOutline: {
        library: 'MaterialIcons',
        iosLibrary: 'SFSymbols',
        ios: 'person',
        android: 'person-outline',
    } as IconDef,

    /** Medical services icon */
    medicalServices: {
        library: 'MaterialIcons',
        iosLibrary: 'SFSymbols',
        ios: 'medical.thermometer',
        android: 'medical-services',
    } as IconDef,

    /** Print icon */
    printOutline: {
        library: 'Ionicons',
        iosLibrary: 'SFSymbols',
        ios: 'printer',
        android: 'print-outline',
    } as IconDef,
};

// ─────────────────────────────────────────────
// Print Preview Header Icons
// ─────────────────────────────────────────────
export const PRINT_PREVIEW_ICONS = {
    back: {
        library: 'Ionicons',
        iosLibrary: 'SFSymbols',
        ios: 'arrow.left.circle',
        android: 'arrow-back-circle-outline',
    } as IconDef,
    print: {
        library: 'Ionicons',
        iosLibrary: 'SFSymbols',
        ios: 'printer',
        android: 'print-outline',
    } as IconDef,
    done: {
        library: 'Ionicons',
        iosLibrary: 'SFSymbols',
        ios: 'checkmark.circle',
        android: 'checkmark-circle-outline',
    } as IconDef,
    filter: {
        library: 'Ionicons',
        iosLibrary: 'SFSymbols',
        ios: 'line.3.horizontal',
        android: 'menu',
    } as IconDef,
};

// ─────────────────────────────────────────────
// Prescription Modal Icons
// ─────────────────────────────────────────────
export const PRESCRIPTION_MODAL_ICONS = {
    /** Close modal */
    close: {
        library: 'Ionicons',
        iosLibrary: 'SFSymbols',
        ios: 'xmark',
        android: 'close',
    } as IconDef,

    /** Add variant */
    add: {
        library: 'Ionicons',
        iosLibrary: 'SFSymbols',
        ios: 'plus',
        android: 'add',
    } as IconDef,

    /** Edit variant */
    createOutline: {
        library: 'Ionicons',
        iosLibrary: 'SFSymbols',
        ios: 'pencil.and.outline',
        android: 'create-outline',
    } as IconDef,

    /** Delete variant */
    trashOutline: {
        library: 'Ionicons',
        iosLibrary: 'SFSymbols',
        ios: 'trash',
        android: 'trash-outline',
    } as IconDef,
};

// ─────────────────────────────────────────────
// Prescription Edit Modal Icons
// ─────────────────────────────────────────────
export const PRESCRIPTION_EDIT_ICONS = {
    /** Close / cancel */
    close: {
        library: 'Ionicons',
        iosLibrary: 'SFSymbols',
        ios: 'xmark',
        android: 'close',
    } as IconDef,

    /** Checkmark / confirm */
    checkmark: {
        library: 'Ionicons',
        iosLibrary: 'SFSymbols',
        ios: 'checkmark',
        android: 'checkmark',
    } as IconDef,
};

// ─────────────────────────────────────────────
// Section Header Icons
// ─────────────────────────────────────────────
export const SECTION_HEADER_ICONS = {
    /** Delete / clear section */
    trashOutline: {
        library: 'Ionicons',
        ios: 'trash-outline',
        android: 'trash-outline',
    } as IconDef,
};

// ─────────────────────────────────────────────
// New Appointment Modal Icons
// ─────────────────────────────────────────────
export const APPOINTMENT_ICONS = {
    /** Close modal */
    closeCircle: {
        library: 'Ionicons',
        iosLibrary: 'SFSymbols',
        ios: 'xmark.circle.fill',
        android: 'close-circle',
    } as IconDef,

    /** Checkmark / select */
    checkmarkCircle: {
        library: 'Ionicons',
        iosLibrary: 'SFSymbols',
        ios: 'checkmark.circle.fill',
        android: 'checkmark-circle',
    } as IconDef,
};

// ─────────────────────────────────────────────
// Register Modal Icons
// ─────────────────────────────────────────────
export const REGISTER_ICONS = {
    /** Close modal */
    closeCircleOutline: {
        library: 'Ionicons',
        iosLibrary: 'SFSymbols',
        ios: 'xmark.circle',
        android: 'close-circle-outline',
    } as IconDef,

    /** Chevron up (dropdown open) */
    chevronUp: {
        library: 'Ionicons',
        iosLibrary: 'SFSymbols',
        ios: 'chevron.up',
        android: 'chevron-up',
    } as IconDef,

    /** Chevron down (dropdown closed) */
    chevronDown: {
        library: 'Ionicons',
        iosLibrary: 'SFSymbols',
        ios: 'chevron.down',
        android: 'chevron-down',
    } as IconDef,
};

// ─────────────────────────────────────────────
// Data Edit Modal Icons (Settings)
// ─────────────────────────────────────────────
export const DATA_EDIT_ICONS = {
    /** Close modal */
    close: {
        library: 'Ionicons',
        ios: 'close',
        android: 'close',
    } as IconDef,
};

// ─────────────────────────────────────────────
// Edit Profile Modal Icons
// ─────────────────────────────────────────────
export const EDIT_PROFILE_ICONS = {
    /** Dropdown arrow */
    keyboardArrowDown: {
        library: 'MaterialIcons',
        iosLibrary: 'SFSymbols',
        ios: 'chevron.down',
        android: 'keyboard-arrow-down',
    } as IconDef,

    /** Close / cancel */
    close: {
        library: 'MaterialCommunityIcons',
        iosLibrary: 'SFSymbols',
        ios: 'xmark',
        android: 'close',
    } as IconDef,

    /** Check / confirm */
    check: {
        library: 'MaterialCommunityIcons',
        iosLibrary: 'SFSymbols',
        ios: 'checkmark',
        android: 'check',
    } as IconDef,
};

// ─────────────────────────────────────────────
// Dashboard Icons
// ─────────────────────────────────────────────
export const DASHBOARD_ICONS = {
    /** Search icon */
    search: {
        library: 'MaterialIcons',
        iosLibrary: 'SFSymbols',
        ios: 'magnifyingglass',
        android: 'search',
    } as IconDef,

    /** Cancel / clear search */
    cancel: {
        library: 'MaterialIcons',
        iosLibrary: 'SFSymbols',
        ios: 'xmark.circle.fill',
        android: 'cancel',
    } as IconDef,

    /** Person avatar */
    person: {
        library: 'MaterialIcons',
        iosLibrary: 'SFSymbols',
        ios: 'person.fill',
        android: 'person',
    } as IconDef,

    /** Chevron right (navigate) */
    chevronRight: {
        library: 'MaterialIcons',
        iosLibrary: 'SFSymbols',
        ios: 'chevron.right',
        android: 'chevron-right',
    } as IconDef,

    /** Check circle (completed) */
    checkCircle: {
        library: 'MaterialIcons',
        iosLibrary: 'SFSymbols',
        ios: 'checkmark.circle.fill',
        android: 'check-circle',
    } as IconDef,

    /** Settings gear */
    settings: {
        library: 'MaterialIcons',
        iosLibrary: 'SFSymbols',
        ios: 'gearshape',
        android: 'settings',
    } as IconDef,

    /** Help / info */
    helpOutline: {
        library: 'MaterialIcons',
        iosLibrary: 'SFSymbols',
        ios: 'questionmark.circle',
        android: 'help-outline',
    } as IconDef,

    /** Calendar plus (new appointment) */
    calendarPlus: {
        library: 'MaterialCommunityIcons',
        iosLibrary: 'SFSymbols',
        ios: 'calendar.badge.plus',
        android: 'calendar-plus',
    } as IconDef,
};

// ─────────────────────────────────────────────
// Settings Screen Icons
// ─────────────────────────────────────────────
export const SETTINGS_ICONS = {
    /** Person / profile */
    personOutline: {
        library: 'Ionicons',
        iosLibrary: 'SFSymbols',
        ios: 'person',
        android: 'person-outline',
    } as IconDef,

    /** Chevron right */
    chevronRight: {
        library: 'MaterialIcons',
        iosLibrary: 'SFSymbols',
        ios: 'chevron.right',
        android: 'chevron-right',
    } as IconDef,

    /** Drag handle */
    dragHandle: {
        library: 'MaterialIcons',
        iosLibrary: 'SFSymbols',
        ios: 'line.3.horizontal',
        android: 'drag-handle',
    } as IconDef,

    /** Logout */
    logout: {
        library: 'MaterialIcons',
        iosLibrary: 'SFSymbols',
        ios: 'rectangle.portrait.and.arrow.right',
        android: 'logout',
    } as IconDef,

    /** Add circle outline */
    addCircleOutline: {
        library: 'MaterialIcons',
        iosLibrary: 'SFSymbols',
        ios: 'plus.circle',
        android: 'add-circle-outline',
    } as IconDef,

    /** Search */
    search: {
        library: 'MaterialIcons',
        iosLibrary: 'SFSymbols',
        ios: 'magnifyingglass',
        android: 'search',
    } as IconDef,

    /** Delete outline */
    deleteOutline: {
        library: 'MaterialIcons',
        iosLibrary: 'SFSymbols',
        ios: 'trash',
        android: 'delete-outline',
    } as IconDef,

    /** Edit */
    edit: {
        library: 'MaterialIcons',
        iosLibrary: 'SFSymbols',
        ios: 'pencil',
        android: 'edit',
    } as IconDef,

    /** Close */
    close: {
        library: 'MaterialIcons',
        iosLibrary: 'SFSymbols',
        ios: 'xmark',
        android: 'close',
    } as IconDef,
};

// ─────────────────────────────────────────────
// Patient Detail Screen Icons
// ─────────────────────────────────────────────
export const PATIENT_ICONS = {
    /** Back chevron */
    chevronLeft: {
        library: 'MaterialIcons',
        iosLibrary: 'SFSymbols',
        ios: 'chevron.left',
        android: 'chevron-left',
    } as IconDef,

    /** Account / profile avatar */
    account: {
        library: 'MaterialCommunityIcons',
        iosLibrary: 'SFSymbols',
        ios: 'person.circle',
        android: 'account',
    } as IconDef,

    /** Printer */
    printer: {
        library: 'MaterialCommunityIcons',
        iosLibrary: 'SFSymbols',
        ios: 'printer',
        android: 'printer',
    } as IconDef,

    /** Export / share */
    exportVariant: {
        library: 'MaterialCommunityIcons',
        iosLibrary: 'SFSymbols',
        ios: 'square.and.arrow.up',
        android: 'export-variant',
    } as IconDef,
};

/**
 * Helper to resolve the correct icon library for the current platform.
 */
export function getIconLibrary(icon: IconDef): IconLibrary {
    if (Platform.OS === 'ios' && icon.iosLibrary) {
        return icon.iosLibrary;
    }
    return icon.library;
}
