import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { FaCirclePlus, FaFileArrowDown, FaFileInvoice, FaPenToSquare, FaPrint, FaTrashCan } from 'react-icons/fa6';
import { AppShell } from '../../app/layout/AppShell';
import { SettingsIcon } from '../../components/ui/SettingsIcon';
import { GlobalDataTable, type GlobalDataTableColumn } from '../../components/ui/GlobalDataTable';
import { GlobalLeftDetailsPanel } from '../../components/ui/GlobalLeftDetailsPanel';
import { GlobalScopedFilters, type GlobalScopedFilterConfig } from '../../components/ui/GlobalScopedFilters';
import type { NavItem } from '../../types/navigation';
import { getCurrentUser, isAuthenticated, logout } from '../../services/authService';
import { getSeasons, type Season } from '../../services/seasonsApi';
import { getFields, type Field } from '../../services/fieldsApi';
import { getHarvestsBySeason, type HarvestRecord } from '../../services/harvestsApi';
import { getClassificationsByHarvest, type ClassificationRecord } from '../../services/classificationsApi';
import { setScopeFilter } from '../../store/globalFiltersSlice';
import type { AppDispatch, RootState } from '../../store';
import { HARVEST_I18N } from './i18n';

const DEFAULT_SIDEBAR_ITEM_ID = 'harvest-daily-details';
const HARVEST_DAILY_FILTER_SCOPE = 'harvest-daily-details';
const EMPTY_FILTERS: Record<string, string> = {};
type HarvestSortKey = 'dateGregorian' | 'totalHarvested' | 'totalRejected' | 'totalAfterRejected' | 'classifiedTotal';
type HarvestSortDirection = 'asc' | 'desc';
type HarvestNumericColumnKey = 'totalHarvested' | 'totalRejected' | 'totalAfterRejected' | 'classifiedTotal';

const HARVEST_NUMERIC_COLUMNS: HarvestNumericColumnKey[] = [
  'totalHarvested',
  'totalRejected',
  'totalAfterRejected',
  'classifiedTotal',
];

function parseSeasonFilterId(value: string): number | null {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : null;
}

function parseFieldFilterId(value: string): number | 'all' {
  if (value === 'all') {
    return 'all';
  }

  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : 'all';
}

export function HarvestPage() {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const location = useLocation();
  const [alertsCount, setAlertsCount] = useState<number>(0);
  const [activeTopId, setActiveTopId] = useState('harvest');
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [fields, setFields] = useState<Field[]>([]);
  const [harvestRows, setHarvestRows] = useState<HarvestRecord[]>([]);
  const [sortConfig, setSortConfig] = useState<{ key: HarvestSortKey; direction: HarvestSortDirection } | null>(null);
  const [detailsRecord, setDetailsRecord] = useState<HarvestRecord | null>(null);
  const [relatedSortings, setRelatedSortings] = useState<ClassificationRecord[]>([]);
  const [isRelatedSortingsLoading, setIsRelatedSortingsLoading] = useState(false);
  const [relatedSortingsLoadError, setRelatedSortingsLoadError] = useState<string>('');
  const [selectedNumericCells, setSelectedNumericCells] = useState<Record<string, number>>({});
  const [isDragSelecting, setIsDragSelecting] = useState(false);
  const dragSelectModeRef = useRef<'add' | 'remove'>('add');
  const detailsPrintRef = useRef<HTMLDivElement | null>(null);
  const [isHarvestLoading, setIsHarvestLoading] = useState(false);
  const [harvestLoadError, setHarvestLoadError] = useState<string>('');
  const globalFilterValues = useSelector(
    (state: RootState) => state.globalFilters.scopes[HARVEST_DAILY_FILTER_SCOPE] ?? EMPTY_FILTERS,
  );
  const currentUser = getCurrentUser();

  useEffect(() => {
    import('../../services/messagesApi').then(({ fetchUnreadCount }) => {
      fetchUnreadCount().then((res) => setAlertsCount(res.count)).catch(() => setAlertsCount(0));
    });
  }, []);

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/login');
    }
  }, [navigate]);

  useEffect(() => {
    const stopSelecting = () => {
      setIsDragSelecting(false);
    };

    window.addEventListener('pointerup', stopSelecting);

    return () => {
      window.removeEventListener('pointerup', stopSelecting);
    };
  }, []);

  const lang = useMemo<'he' | 'en'>(() => {
    if (typeof window !== 'undefined') {
      const stored = window.localStorage.getItem('app.language');
      if (stored === 'he' || stored === 'en') {
        return stored;
      }
    }
    return 'he';
  }, []);

  const t = HARVEST_I18N[lang];

  const activeSidebarId = useMemo(() => {
    const pathParts = location.pathname.split('/').filter(Boolean);
    const subRoute = pathParts[1];
    return subRoute || DEFAULT_SIDEBAR_ITEM_ID;
  }, [location.pathname]);

  const pageTitle = useMemo(() => {
    for (const section of t.sidebar) {
      if (section.id === activeSidebarId) {
        return section.title;
      }

      const activeItem = section.items.find((item) => item.id === activeSidebarId);
      if (activeItem) {
        return activeItem.label;
      }
    }

    return t.pageTitle;
  }, [activeSidebarId, t.pageTitle, t.sidebar]);

  const content = useMemo(() => {
    return t.emptyState[activeSidebarId] ?? t.emptyState.default;
  }, [activeSidebarId, t.emptyState]);

  const handleTopNavClick = (item: NavItem) => {
    setActiveTopId(item.id);
    navigate(`/${item.id}`);
  };

  const handleSidebarClick = (item: NavItem) => {
    navigate(item.href || `/harvest/${item.id}`);
  };

  const isDailyDetailsTab = activeSidebarId === 'harvest-daily-details';

  const activeSeasonId = useMemo(() => {
    return seasons.find((season) => season.isActive)?.id ?? null;
  }, [seasons]);

  const seasonFilterId = useMemo(() => {
    return parseSeasonFilterId(globalFilterValues.seasonId ?? '');
  }, [globalFilterValues.seasonId]);

  const fieldFilterId = useMemo<number | 'all'>(() => {
    return parseFieldFilterId(globalFilterValues.fieldId ?? 'all');
  }, [globalFilterValues.fieldId]);

  useEffect(() => {
    if (!isDailyDetailsTab) {
      return;
    }

    let isMounted = true;

    const loadFiltersData = async () => {
      setHarvestLoadError('');

      try {
        const [nextSeasons, nextFields] = await Promise.all([getSeasons(), getFields()]);

        if (!isMounted) {
          return;
        }

        setSeasons(nextSeasons);
        setFields(nextFields);
      } catch {
        if (!isMounted) {
          return;
        }

        setHarvestLoadError(t.dailyDetails.loadError);
      }
    };

    void loadFiltersData();

    return () => {
      isMounted = false;
    };
  }, [isDailyDetailsTab, t.dailyDetails.loadError]);

  useEffect(() => {
    if (!isDailyDetailsTab) {
      return;
    }

    if (activeSeasonId && (seasonFilterId === null || !seasons.some((season) => season.id === seasonFilterId))) {
      dispatch(
        setScopeFilter({
          scope: HARVEST_DAILY_FILTER_SCOPE,
          key: 'seasonId',
          value: String(activeSeasonId),
        }),
      );
      return;
    }

    if (!activeSeasonId && seasonFilterId !== null && !seasons.some((season) => season.id === seasonFilterId)) {
      dispatch(
        setScopeFilter({
          scope: HARVEST_DAILY_FILTER_SCOPE,
          key: 'seasonId',
          value: seasons[0] ? String(seasons[0].id) : '',
        }),
      );
    }
  }, [activeSeasonId, dispatch, isDailyDetailsTab, seasonFilterId, seasons]);

  useEffect(() => {
    if (!isDailyDetailsTab) {
      return;
    }

    if (!seasonFilterId) {
      setHarvestRows([]);
      return;
    }

    let isMounted = true;

    const loadHarvestRows = async () => {
      setIsHarvestLoading(true);
      setHarvestLoadError('');

      try {
        const records = await getHarvestsBySeason(seasonFilterId);

        if (!isMounted) {
          return;
        }

        setHarvestRows(records);
      } catch {
        if (!isMounted) {
          return;
        }

        setHarvestRows([]);
        setHarvestLoadError(t.dailyDetails.loadError);
      } finally {
        if (isMounted) {
          setIsHarvestLoading(false);
        }
      }
    };

    void loadHarvestRows();

    return () => {
      isMounted = false;
    };
  }, [isDailyDetailsTab, seasonFilterId, t.dailyDetails.loadError]);

  const formatGregorianDate = (value: string) => {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    const locale = lang === 'he' ? 'he-IL' : 'en-GB';
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  };

  const escapeHtml = (value: string) => {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };

  const escapeCsv = (value: string | number | boolean | null | undefined) => {
    const normalized = String(value ?? '');
    const escaped = normalized.replace(/\"/g, '""');
    return `"${escaped}"`;
  };

  const createHarvestExportRows = () => {
    const fields = t.dailyDetails.detailsPanel.fields;
    const values = t.dailyDetails.detailsPanel.values;

    const header = [
      t.dailyDetails.columns.fieldName,
      t.dailyDetails.columns.dateGregorian,
      fields.dateHebrew,
      t.dailyDetails.columns.totalHarvested,
      t.dailyDetails.columns.totalRejected,
      fields.totalAfterRejected,
      fields.ownerHarvested,
      fields.ownerRejected,
      fields.ownerAfterRejected,
      t.dailyDetails.columns.classifiedTotal,
      fields.classificationStatus,
      fields.rejectionRate,
      fields.ownerRejectionRate,
      fields.updatedBy,
      fields.notes,
    ];

    const getClassificationStatus = (isPartialClassification: unknown) => {
      return isPartialClassificationFlag(isPartialClassification) ? values.partial : values.final;
    };

    const rows = sortedHarvestRows.map((row) => [
      row.field?.name ?? values.none,
      formatGregorianDate(row.dateGregorian),
      row.dateHebrew,
      row.totalHarvested,
      row.totalRejected,
      row.totalAfterRejected,
      row.ownerHarvested,
      row.ownerRejected,
      row.ownerAfterRejected,
      row.classifiedTotal,
      getClassificationStatus(row.isPartialClassification),
      row.rejectionRate,
      row.ownerRejectionRate,
      row.updatedBy?.name ?? values.none,
      row.notes ?? values.none,
    ]);

    return { header, rows };
  };

  const handlePrintHarvestTable = () => {
    if (typeof window === 'undefined') {
      return;
    }

    const { header, rows } = createHarvestExportRows();
    const tableHeaderHtml = header.map((label) => `<th>${escapeHtml(label)}</th>`).join('');
    const tableRowsHtml = rows
      .map((row) => `<tr>${row.map((value) => `<td>${escapeHtml(String(value))}</td>`).join('')}</tr>`)
      .join('');

    const printWindow = window.open('', '_blank', 'width=1100,height=760');
    if (!printWindow) {
      return;
    }

    const printTitle = lang === 'he' ? 'דוח קטיף לפי ימים' : 'Harvest Daily Details';

    printWindow.document.write(`
      <!doctype html>
      <html lang="${lang === 'he' ? 'he' : 'en'}" dir="${lang === 'he' ? 'rtl' : 'ltr'}">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>${escapeHtml(printTitle)}</title>
          <style>
            * { box-sizing: border-box; }
            body {
              margin: 0;
              padding: 22px;
              font-family: Assistant, sans-serif;
              color: #1f2a22;
              background: #fff;
            }
            h1 {
              margin: 0 0 14px;
              font-size: 22px;
              color: #1f4f29;
              text-align: center;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              table-layout: auto;
              font-size: 10px;
            }
            th,
            td {
              border: 1px solid #ccd9cf;
              padding: 5px;
              text-align: center;
              white-space: nowrap;
            }
            th {
              background: #1f5a32;
              color: #fff;
              font-weight: 700;
            }
            tbody tr:nth-child(even) {
              background: #f8fcf9;
            }
            @page {
              size: A4 landscape;
              margin: 8mm;
            }
          </style>
        </head>
        <body>
          <h1>${escapeHtml(printTitle)}</h1>
          <table>
            <thead>
              <tr>${tableHeaderHtml}</tr>
            </thead>
            <tbody>
              ${tableRowsHtml}
            </tbody>
          </table>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  const handleExportHarvestTableToExcel = () => {
    if (typeof window === 'undefined') {
      return;
    }

    const { header, rows } = createHarvestExportRows();
    const csvLines = [header, ...rows].map((row) => row.map((value) => escapeCsv(value)).join(','));
    const csvContent = `\ufeff${csvLines.join('\n')}`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');

    const dateStamp = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = lang === 'he' ? `harvest-daily-${dateStamp}.csv` : `harvest-daily-${dateStamp}.csv`;
    document.body.append(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const toggleSort = (key: HarvestSortKey) => {
    setSortConfig((prev) => {
      if (!prev || prev.key !== key) {
        return { key, direction: 'desc' };
      }

      return { key, direction: prev.direction === 'desc' ? 'asc' : 'desc' };
    });
  };

  const renderSortableHeader = (label: string, key: HarvestSortKey) => {
    const isActive = sortConfig?.key === key;
    const direction = isActive ? sortConfig.direction : null;

    return (
      <button
        type="button"
        className={`global-data-table__sort-button${isActive ? ' is-active' : ''}`}
        onClick={() => toggleSort(key)}
        aria-label={`${label} - מיון`}
      >
        <span>{label}</span>
        <span className="global-data-table__sort-indicator" aria-hidden="true">
          {direction === 'asc' ? '▲' : direction === 'desc' ? '▼' : '↕'}
        </span>
      </button>
    );
  };

  const buildNumericCellId = (rowId: number, column: HarvestNumericColumnKey) => `${rowId}:${column}`;

  const applyNumericCellSelection = (cellId: string, value: number) => {
    setSelectedNumericCells((prev) => {
      const next = { ...prev };

      if (dragSelectModeRef.current === 'add') {
        next[cellId] = value;
      } else {
        delete next[cellId];
      }

      return next;
    });
  };

  const handleNumericCellPointerDown = (rowId: number, column: HarvestNumericColumnKey, value: number) => (event: React.PointerEvent) => {
    if (event.pointerType === 'mouse' && event.button !== 0) {
      return;
    }

    event.preventDefault();

    const cellId = buildNumericCellId(rowId, column);
    dragSelectModeRef.current = selectedNumericCells[cellId] !== undefined ? 'remove' : 'add';
    applyNumericCellSelection(cellId, value);
    setIsDragSelecting(true);
  };

  const handleNumericCellPointerEnter = (rowId: number, column: HarvestNumericColumnKey, value: number) => () => {
    if (!isDragSelecting) {
      return;
    }

    const cellId = buildNumericCellId(rowId, column);
    applyNumericCellSelection(cellId, value);
  };

  const renderNumericCell = (
    row: HarvestRecord,
    column: HarvestNumericColumnKey,
    value: number,
    content?: React.ReactNode,
  ) => {
    const cellId = buildNumericCellId(row.id, column);
    const isSelected = selectedNumericCells[cellId] !== undefined;

    return (
      <button
        type="button"
        className={`harvest-daily-workspace__numeric-cell${isSelected ? ' is-selected' : ''}`}
        onPointerDown={handleNumericCellPointerDown(row.id, column, value)}
        onPointerEnter={handleNumericCellPointerEnter(row.id, column, value)}
        aria-pressed={isSelected}
      >
        {content ?? value}
      </button>
    );
  };

  const columns = useMemo<GlobalDataTableColumn<HarvestRecord>[]>(() => {
    return [
      {
        id: 'actions',
        header: lang === 'he' ? 'פרטים' : 'Details',
        headerLabel: lang === 'he' ? 'פרטים' : 'Details',
        minWidth: '72px',
        gridTemplate: '72px',
        align: 'center',
        render: (row) => (
          <button
            type="button"
            className="harvest-daily-workspace__details-trigger"
            aria-label={t.dailyDetails.detailsPanel.openDetails}
            onClick={() => setDetailsRecord(row)}
          >
            <FaFileInvoice />
          </button>
        ),
      },
      {
        id: 'dateGregorian',
        header: renderSortableHeader(t.dailyDetails.columns.dateGregorian, 'dateGregorian'),
        headerLabel: t.dailyDetails.columns.dateGregorian,
        minWidth: '120px',
        render: (row) => formatGregorianDate(row.dateGregorian),
      },
      {
        id: 'dateHebrew',
        header: t.dailyDetails.columns.dateHebrew,
        headerLabel: t.dailyDetails.columns.dateHebrew,
        minWidth: '132px',
        render: (row) => row.dateHebrew,
      },
      {
        id: 'fieldName',
        header: t.dailyDetails.columns.fieldName,
        headerLabel: t.dailyDetails.columns.fieldName,
        minWidth: '116px',
        render: (row) => row.field?.name ?? '-',
      },
      {
        id: 'totalHarvested',
        header: renderSortableHeader(t.dailyDetails.columns.totalHarvested, 'totalHarvested'),
        headerLabel: t.dailyDetails.columns.totalHarvested,
        minWidth: '104px',
        align: 'center',
        render: (row) => renderNumericCell(row, 'totalHarvested', row.totalHarvested),
      },
      {
        id: 'totalRejected',
        header: renderSortableHeader(t.dailyDetails.columns.totalRejected, 'totalRejected'),
        headerLabel: t.dailyDetails.columns.totalRejected,
        minWidth: '104px',
        align: 'center',
        render: (row) => renderNumericCell(row, 'totalRejected', row.totalRejected),
      },
      {
        id: 'totalAfterRejected',
        header: renderSortableHeader(t.dailyDetails.columns.netHarvest, 'totalAfterRejected'),
        headerLabel: t.dailyDetails.columns.netHarvest,
        minWidth: '110px',
        align: 'center',
        render: (row) => renderNumericCell(row, 'totalAfterRejected', row.totalAfterRejected),
      },
      {
        id: 'classifiedTotal',
        header: renderSortableHeader(t.dailyDetails.columns.classifiedTotal, 'classifiedTotal'),
        headerLabel: t.dailyDetails.columns.classifiedTotal,
        minWidth: '110px',
        align: 'center',
        render: (row) => (
          renderNumericCell(
            row,
            'classifiedTotal',
            row.classifiedTotal,
            <span
              className={`harvest-daily-workspace__classified-total${isPartialClassificationFlag(row.isPartialClassification as unknown) ? ' harvest-daily-workspace__classified-total--partial' : ''}`}
            >
              {row.classifiedTotal}
            </span>,
          )
        ),
      },
    ];
  }, [t, lang, sortConfig, isDragSelecting, selectedNumericCells]);

  const filteredHarvestRows = useMemo(() => {
    return harvestRows.filter((row) => (fieldFilterId === 'all' ? true : row.fieldId === fieldFilterId));
  }, [harvestRows, fieldFilterId]);

  const sortedHarvestRows = useMemo(() => {
    if (!sortConfig) {
      return filteredHarvestRows;
    }

    const directionFactor = sortConfig.direction === 'asc' ? 1 : -1;
    const rows = [...filteredHarvestRows];

    rows.sort((a, b) => {
      let comparison = 0;

      switch (sortConfig.key) {
        case 'dateGregorian': {
          const aTime = Date.parse(a.dateGregorian);
          const bTime = Date.parse(b.dateGregorian);
          comparison = (Number.isNaN(aTime) ? 0 : aTime) - (Number.isNaN(bTime) ? 0 : bTime);
          break;
        }
        case 'totalHarvested':
          comparison = a.totalHarvested - b.totalHarvested;
          break;
        case 'totalRejected':
          comparison = a.totalRejected - b.totalRejected;
          break;
        case 'totalAfterRejected':
          comparison = a.totalAfterRejected - b.totalAfterRejected;
          break;
        case 'classifiedTotal':
          comparison = a.classifiedTotal - b.classifiedTotal;
          break;
        default:
          comparison = 0;
      }

      if (comparison !== 0) {
        return comparison * directionFactor;
      }

      return a.id - b.id;
    });

    return rows;
  }, [filteredHarvestRows, sortConfig]);

  useEffect(() => {
    if (!detailsRecord) {
      return;
    }

    if (!sortedHarvestRows.some((row) => row.id === detailsRecord.id)) {
      setDetailsRecord(null);
    }
  }, [detailsRecord, sortedHarvestRows]);

  useEffect(() => {
    if (!detailsRecord) {
      setRelatedSortings([]);
      setRelatedSortingsLoadError('');
      setIsRelatedSortingsLoading(false);
      return;
    }

    let isMounted = true;

    const loadRelatedSortings = async () => {
      setIsRelatedSortingsLoading(true);
      setRelatedSortingsLoadError('');

      try {
        const rows = await getClassificationsByHarvest(detailsRecord.id);

        if (!isMounted) {
          return;
        }

        setRelatedSortings(rows);
      } catch {
        if (!isMounted) {
          return;
        }

        setRelatedSortings([]);
        setRelatedSortingsLoadError(t.dailyDetails.detailsPanel.relatedSortings.loadError);
      } finally {
        if (isMounted) {
          setIsRelatedSortingsLoading(false);
        }
      }
    };

    void loadRelatedSortings();

    return () => {
      isMounted = false;
    };
  }, [detailsRecord, t.dailyDetails.detailsPanel.relatedSortings.loadError]);

  useEffect(() => {
    if (sortedHarvestRows.length === 0) {
      if (Object.keys(selectedNumericCells).length > 0) {
        setSelectedNumericCells({});
      }
      return;
    }

    const validIds = new Set(sortedHarvestRows.map((row) => String(row.id)));

    setSelectedNumericCells((prev) => {
      let changed = false;
      const next: Record<string, number> = {};

      for (const [cellId, value] of Object.entries(prev)) {
        const [rowId, column] = cellId.split(':');
        if (validIds.has(rowId) && HARVEST_NUMERIC_COLUMNS.includes(column as HarvestNumericColumnKey)) {
          next[cellId] = value;
        } else {
          changed = true;
        }
      }

      return changed ? next : prev;
    });
  }, [selectedNumericCells, sortedHarvestRows]);

  const selectedCellsCount = useMemo(() => Object.keys(selectedNumericCells).length, [selectedNumericCells]);

  const selectedCellsTotal = useMemo(
    () => Object.values(selectedNumericCells).reduce((sum, value) => sum + value, 0),
    [selectedNumericCells],
  );

  const formattedSelectedTotal = useMemo(() => {
    const locale = lang === 'he' ? 'he-IL' : 'en-US';
    return new Intl.NumberFormat(locale).format(selectedCellsTotal);
  }, [lang, selectedCellsTotal]);

  const numberFormatter = useMemo(() => {
    const locale = lang === 'he' ? 'he-IL' : 'en-US';
    return new Intl.NumberFormat(locale);
  }, [lang]);

  const percentFormatter = useMemo(() => {
    const locale = lang === 'he' ? 'he-IL' : 'en-US';
    return new Intl.NumberFormat(locale, { maximumFractionDigits: 2 });
  }, [lang]);

  const formatRate = (value: number | string) => {
    const numeric = typeof value === 'string' ? Number(value) : value;
    if (!Number.isFinite(numeric)) {
      return String(value);
    }
    return `${percentFormatter.format(numeric)}%`;
  };

  const toNumericValue = (value: number | string) => {
    const numeric = typeof value === 'string' ? Number(value) : value;
    return Number.isFinite(numeric) ? numeric : 0;
  };

  const isPartialClassificationFlag = (value: unknown) => {
    if (typeof value === 'boolean') {
      return value;
    }
    if (typeof value === 'number') {
      return value === 1;
    }
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      return normalized === '1' || normalized === 'true' || normalized === 'yes';
    }
    return false;
  };

  const detailsSheetData = useMemo(() => {
    if (!detailsRecord) {
      return null;
    }

    const labels = t.dailyDetails.detailsPanel.fields;
    const values = t.dailyDetails.detailsPanel.values;
    const isPartialClassification = isPartialClassificationFlag(detailsRecord.isPartialClassification as unknown);
    const seasonName = seasons.find((season) => season.id === detailsRecord.seasonId)?.yearName ?? values.none;
    const seasonRows = harvestRows
      .filter((row) => row.seasonId === detailsRecord.seasonId)
      .sort((a, b) => {
        const aTime = Date.parse(a.dateGregorian);
        const bTime = Date.parse(b.dateGregorian);

        if (!Number.isNaN(aTime) && !Number.isNaN(bTime) && aTime !== bTime) {
          return aTime - bTime;
        }

        return a.id - b.id;
      });
    const harvestIndexInSeason = seasonRows.findIndex((row) => row.id === detailsRecord.id);
    const harvestNumberDisplay =
      harvestIndexInSeason >= 0
        ? numberFormatter.format(harvestIndexInSeason + 1)
        : values.none;
    const hasOwnerRowData =
      detailsRecord.ownerHarvested > 0 ||
      detailsRecord.ownerRejected > 0 ||
      detailsRecord.ownerAfterRejected > 0 ||
      Number(detailsRecord.ownerRejectionRate) > 0;

    const rows = [
      {
        key: 'general',
        kind: 'regular',
        label: values.generalRow,
        totalHarvested: numberFormatter.format(detailsRecord.totalHarvested),
        totalRejected: numberFormatter.format(detailsRecord.totalRejected),
        totalAfterRejected: numberFormatter.format(detailsRecord.totalAfterRejected),
        classifiedTotal: numberFormatter.format(detailsRecord.classifiedTotal),
        rejectionRate: formatRate(detailsRecord.rejectionRate),
      },
    ];

    if (hasOwnerRowData) {
      rows.push({
        key: 'owner',
        kind: 'regular',
        label: values.ownerRow,
        totalHarvested: numberFormatter.format(detailsRecord.ownerHarvested),
        totalRejected: numberFormatter.format(detailsRecord.ownerRejected),
        totalAfterRejected: numberFormatter.format(detailsRecord.ownerAfterRejected),
        classifiedTotal: values.none,
        rejectionRate: formatRate(detailsRecord.ownerRejectionRate),
      });

      rows.push({
        key: 'difference',
        kind: 'summary',
        label: values.differenceRow,
        totalHarvested: numberFormatter.format(detailsRecord.totalHarvested - detailsRecord.ownerHarvested),
        totalRejected: numberFormatter.format(detailsRecord.totalRejected - detailsRecord.ownerRejected),
        totalAfterRejected: numberFormatter.format(detailsRecord.totalAfterRejected - detailsRecord.ownerAfterRejected),
        classifiedTotal: values.none,
        rejectionRate: formatRate(toNumericValue(detailsRecord.rejectionRate) - toNumericValue(detailsRecord.ownerRejectionRate)),
      });
    }

    return {
      dateGregorian: formatGregorianDate(detailsRecord.dateGregorian),
      dateHebrew: detailsRecord.dateHebrew || values.none,
      seasonName,
      harvestNumber: harvestNumberDisplay,
      fieldName: detailsRecord.field?.name ?? values.none,
      updatedByName: detailsRecord.updatedBy?.name ?? values.none,
      statusLabel: `${values.statusPrefix} ${isPartialClassification ? values.partial : values.final}`,
      notes: detailsRecord.notes?.trim() || '',
      rows,
      labels,
      values,
    };
  }, [
    detailsRecord,
    formatGregorianDate,
    harvestRows,
    numberFormatter,
    seasons,
    t.dailyDetails.detailsPanel.fields,
    t.dailyDetails.detailsPanel.values,
  ]);

  const relatedSortingsLabels = t.dailyDetails.detailsPanel.relatedSortings;

  const getRelatedSortingAssignmentLabel = (assignmentType: string) => {
    if (assignmentType === 'TRADER') {
      return relatedSortingsLabels.assignmentTypes.trader;
    }

    if (assignmentType === 'CUSTOMER') {
      return relatedSortingsLabels.assignmentTypes.customer;
    }

    return relatedSortingsLabels.assignmentTypes.general;
  };

  const getRelatedSortingTarget = (row: ClassificationRecord) => {
    if (row.assignmentType === 'TRADER') {
      return row.trader?.name ?? detailsSheetData?.values.none ?? '-';
    }

    if (row.assignmentType === 'CUSTOMER') {
      return row.customer?.customerName ?? detailsSheetData?.values.none ?? '-';
    }

    return relatedSortingsLabels.assignmentTypes.general;
  };

  const getRelatedSortingCategory = (row: ClassificationRecord) => {
    if (row.customerCategory?.name) {
      return row.customerCategory.name;
    }

    if (row.traderCategory?.name) {
      return row.traderCategory.name;
    }

    return detailsSheetData?.values.none ?? '-';
  };

  const getRelatedSortingGrade = (row: ClassificationRecord) => {
    if (row.grade) {
      return row.grade;
    }

    if (row.customerCategory?.grade) {
      return row.customerCategory.grade;
    }

    return detailsSheetData?.values.none ?? '-';
  };

  const formatRelatedSortingText = (value?: string | null) => {
    if (!value) {
      return detailsSheetData?.values.none ?? '-';
    }

    const normalizedValue = value.replace(/\s+/g, '_').toUpperCase();

    if (normalizedValue === 'WITH_PITAM') {
      return relatedSortingsLabels.pitamValues.withPitam;
    }

    if (normalizedValue === 'WITHOUT_PITAM') {
      return relatedSortingsLabels.pitamValues.withoutPitam;
    }

    return value.replace(/_/g, ' ');
  };

  const getRelatedSortingNote = (row: ClassificationRecord) => row.notes?.trim() ?? '';

  const sortedRelatedSortings = useMemo(() => {
    const locale = lang === 'he' ? 'he' : 'en';

    const getAssignmentOrder = (assignmentType: string) => {
      if (assignmentType === 'GENERAL') {
        return 0;
      }

      if (assignmentType === 'TRADER') {
        return 1;
      }

      if (assignmentType === 'CUSTOMER') {
        return 2;
      }

      return 3;
    };

    const getCategoryNameForSort = (row: ClassificationRecord) => row.customerCategory?.name ?? row.traderCategory?.name ?? '';

    const getGradeForSort = (row: ClassificationRecord) => row.grade ?? row.customerCategory?.grade ?? '';

    return [...relatedSortings].sort((a, b) => {
      const assignmentDiff = getAssignmentOrder(a.assignmentType) - getAssignmentOrder(b.assignmentType);
      if (assignmentDiff !== 0) {
        return assignmentDiff;
      }

      const categoryDiff = getCategoryNameForSort(a).localeCompare(getCategoryNameForSort(b), locale, {
        sensitivity: 'base',
        numeric: true,
      });
      if (categoryDiff !== 0) {
        return categoryDiff;
      }

      return getGradeForSort(a).localeCompare(getGradeForSort(b), locale, {
        sensitivity: 'base',
        numeric: true,
      });
    });
  }, [lang, relatedSortings]);

  const pageTitleWithCount = useMemo(() => {
    if (!isDailyDetailsTab) {
      return pageTitle;
    }

    return `${pageTitle} (${sortedHarvestRows.length})`;
  }, [isDailyDetailsTab, pageTitle, sortedHarvestRows.length]);

  const addActionLabel = lang === 'he' ? 'הוסף קטיף' : 'Add Harvest';
  const editActionLabel = lang === 'he' ? 'עריכה' : 'Edit';
  const deleteActionLabel = lang === 'he' ? 'מחיקה' : 'Delete';

  const pageHeaderActions = isDailyDetailsTab ? (
    <div className="settings-seasons-header-buttons">
      <button
        type="button"
        className="settings-seasons-header-btn settings-seasons-header-btn--success"
        onClick={() => void 0}
        aria-label={addActionLabel}
      >
        <FaCirclePlus />
        <span>{addActionLabel}</span>
      </button>
      <button
        type="button"
        className="settings-seasons-header-btn settings-seasons-header-btn--success"
        onClick={() => void 0}
        disabled={!detailsRecord}
        aria-label={editActionLabel}
      >
        <FaPenToSquare />
        <span>{editActionLabel}</span>
      </button>
      <button
        type="button"
        className="settings-seasons-header-btn settings-seasons-header-btn--danger"
        onClick={() => void 0}
        disabled={!detailsRecord}
        aria-label={deleteActionLabel}
      >
        <FaTrashCan />
        <span>{deleteActionLabel}</span>
      </button>
    </div>
  ) : null;

  const filters = useMemo<GlobalScopedFilterConfig[]>(() => {
    return [
      {
        key: 'seasonId',
        label: t.dailyDetails.filters.seasonFilterLabel,
        defaultValue: activeSeasonId ? String(activeSeasonId) : '',
        queryParam: 'hdSeason',
        options:
          seasons.length > 0
            ? seasons.map((season) => ({
                value: String(season.id),
                label: `${season.yearName}${season.isActive ? ` (${t.dailyDetails.filters.activeSeasonBadge})` : ''}`,
              }))
            : [{ value: '', label: t.dailyDetails.filters.noActiveSeason }],
      },
      {
        key: 'fieldId',
        label: t.dailyDetails.filters.fieldFilterLabel,
        defaultValue: 'all',
        queryParam: 'hdField',
        options: [
          { value: 'all', label: t.dailyDetails.filters.allFieldsOption },
          ...fields.map((field) => ({
            value: String(field.id),
            label: field.name,
          })),
        ],
      },
    ];
  }, [activeSeasonId, fields, seasons, t.dailyDetails.filters]);

  const handlePrintDetails = () => {
    if (typeof window === 'undefined') {
      return;
    }

    const printableNode = detailsPrintRef.current;
    if (!printableNode) {
      return;
    }

    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) {
      return;
    }

    const printableHtml = printableNode.outerHTML;
    const title = t.dailyDetails.detailsPanel.title;
    const printHeading = lang === 'he' ? 'פרטי קטיף' : 'Harvest Details';

    printWindow.document.write(`
      <!doctype html>
      <html lang="${lang === 'he' ? 'he' : 'en'}" dir="${lang === 'he' ? 'rtl' : 'ltr'}">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>${title}</title>
          <style>
            * { box-sizing: border-box; }
            body {
              margin: 0;
              padding: 24px;
              font-family: Assistant, sans-serif;
              background: #fff;
              color: #1f2a22;
            }
            .harvest-print__title {
              margin: 0 auto 12px;
              max-width: 1180px;
              text-align: center;
              font-size: 22px;
              font-weight: 800;
              color: #1f4f29;
            }
            .harvest-daily-workspace__print-content {
              max-width: 1180px;
              margin: 0 auto;
              display: grid;
              gap: 14px;
            }
            .harvest-daily-workspace__sheet-card {
              border: 1px solid #cfdcd2;
              border-radius: 12px;
              background: #fff;
              padding: 12px;
              display: grid;
              gap: 12px;
            }
            .harvest-daily-workspace__sheet-head {
              display: flex;
              flex-direction: column;
              gap: 6px;
              align-items: stretch;
              direction: ltr;
              text-align: left;
              color: #243f2b;
              font-weight: 600;
            }
            .harvest-daily-workspace__sheet-head p {
              margin: 0;
              width: 100%;
              max-width: 100%;
              direction: inherit;
              unicode-bidi: plaintext;
            }
            html[dir='rtl'] .harvest-daily-workspace__sheet-head {
              direction: rtl;
              text-align: right;
            }
            .harvest-daily-workspace__sheet-status {
              justify-self: center;
              border: 1px solid #b7cdbf;
              background: #f1f8f3;
              color: #1f4f29;
              font-weight: 800;
              padding: 4px 12px;
              border-radius: 999px;
            }
            .harvest-daily-workspace__sheet-table {
              width: 100%;
              border-collapse: collapse;
              table-layout: fixed;
              font-size: 12px;
            }
            .harvest-daily-workspace__sheet-table th,
            .harvest-daily-workspace__sheet-table td {
              border: 1px solid #ccd9cf;
              padding: 6px;
              text-align: center;
              vertical-align: middle;
            }
            .harvest-daily-workspace__sheet-table th {
              background: #f1f7f3;
              color: #284f31;
              font-weight: 700;
              white-space: nowrap;
            }
            .harvest-daily-workspace__sheet-row--summary {
              background: #e7f2eb !important;
            }
            .harvest-daily-workspace__sheet-row--summary td {
              font-weight: 800;
              color: #1f4f29;
            }
            .harvest-daily-workspace__sheet-note {
              margin: 0;
              color: #2f4536;
              line-height: 1.45;
              border-top: 1px dashed #d0dcd3;
              padding-top: 8px;
            }
            .harvest-daily-workspace__related-sortings-card {
              border-radius: 12px;
              background: #fff;
              padding: 12px;
              display: grid;
              gap: 10px;
            }
            .harvest-daily-workspace__related-sortings-title {
              margin: 0;
              color: #214f2a;
              font-size: 16px;
            }
            .harvest-daily-workspace__related-sortings-table-wrap {
              overflow: visible;
            }
            .harvest-daily-workspace__related-sortings-table {
              width: 100%;
              border-collapse: collapse;
              table-layout: fixed;
              font-size: 12px;
            }
            .harvest-daily-workspace__related-sortings-table th,
            .harvest-daily-workspace__related-sortings-table td {
              border: 1px solid #ccd9cf;
              padding: 6px;
              text-align: center;
              vertical-align: middle;
            }
            .harvest-daily-workspace__related-sortings-table th {
              background: #f1f7f3;
              color: #284f31;
              font-weight: 700;
            }
            .harvest-daily-workspace__related-sortings-table tbody tr:nth-child(even) {
              background: #f8fcf9;
            }
            .harvest-daily-workspace__related-sorting-note {
              display: inline;
            }
            .harvest-daily-workspace__related-sorting-note-bubble,
            .harvest-daily-workspace__related-sorting-note-tooltip {
              display: none !important;
            }
            .harvest-daily-workspace__related-sorting-note::after {
              content: attr(aria-label);
              color: #2f4536;
              white-space: pre-wrap;
            }
            @page {
              size: A4 landscape;
              margin: 10mm;
            }
          </style>
        </head>
        <body>
          <h1 class="harvest-print__title">${printHeading}</h1>
          ${printableHtml}
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  return (
    <AppShell
      direction={lang === 'he' ? 'rtl' : 'ltr'}
      brandName="Wieders etrogs"
      pageTitle={pageTitleWithCount}
      pageHeaderActions={pageHeaderActions}
      topNav={t.topNav}
      activeTopNavId={activeTopId}
      sidebarSections={t.sidebar}
      activeSidebarItemId={activeSidebarId}
      onTopNavClick={handleTopNavClick}
      onSidebarClick={handleSidebarClick}
      onBrandClick={() => navigate('/home')}
      topBarOptions={{
        alertsCount,
        onAlertsClick: () => navigate('/messages'),
        isAuthenticated: isAuthenticated(),
        onLogin: () => navigate('/login'),
        onRegister: () => navigate('/register'),
        onLogout: async () => {
          await logout();
          navigate('/login');
        },
        onProfile: () => navigate('/profile'),
        userName: currentUser?.name || '',
      }}
      sidebarFooterSlot={
        <button
          type="button"
          className="app-shell__sidebar-item app-shell__sidebar-settings"
          onClick={() => navigate('/settings')}
        >
          {lang === 'he' ? (
            <>
              {t.settings}
              <SettingsIcon style={{ marginInlineStart: 8 }} />
            </>
          ) : (
            <>
              <SettingsIcon style={{ marginInlineEnd: 8 }} />
              {t.settings}
            </>
          )}
        </button>
      }
    >
      {isDailyDetailsTab ? (
        <section className="settings-workspace harvest-daily-workspace">
          <header className="settings-workspace__header">
            <div>
              <p className="settings-workspace__description">{t.dailyDetails.description}</p>
            </div>
          </header>

          <GlobalScopedFilters
            scope={HARVEST_DAILY_FILTER_SCOPE}
            filters={filters}
            direction={lang === 'he' ? 'rtl' : 'ltr'}
            actions={
              <div className="global-filters-bar__icon-actions" aria-label={lang === 'he' ? 'פעולות טבלה' : 'Table actions'}>
                <button
                  type="button"
                  className="global-filters-bar__icon-btn"
                  onClick={handlePrintHarvestTable}
                  aria-label={lang === 'he' ? 'הדפסת טבלת הקטיפים' : 'Print harvest table'}
                  title={lang === 'he' ? 'הדפסה' : 'Print'}
                >
                  <FaPrint />
                </button>
                <button
                  type="button"
                  className="global-filters-bar__icon-btn"
                  onClick={handleExportHarvestTableToExcel}
                  aria-label={lang === 'he' ? 'יצוא טבלת הקטיפים לאקסל' : 'Export harvest table to Excel'}
                  title={lang === 'he' ? 'יצוא לאקסל' : 'Export to Excel'}
                >
                  <FaFileArrowDown />
                </button>
              </div>
            }
          />

          {harvestLoadError ? <p className="seasons-manager__error">{harvestLoadError}</p> : null}

          <div className="settings-panel-wide harvest-daily-workspace__panel">
            {isHarvestLoading ? <p className="seasons-manager__state">{t.dailyDetails.loading}</p> : null}

            {!isHarvestLoading ? (
              <>
                <GlobalDataTable
                  columns={columns}
                  rows={sortedHarvestRows}
                  getRowKey={(row) => row.id}
                  emptyLabel={t.dailyDetails.empty}
                />

                <GlobalLeftDetailsPanel
                  isOpen={detailsRecord !== null}
                  title={t.dailyDetails.detailsPanel.title}
                  closeLabel={t.dailyDetails.detailsPanel.close}
                  onClose={() => setDetailsRecord(null)}
                  headerActions={
                    <button
                      type="button"
                      className="global-left-details-panel__print"
                      onClick={handlePrintDetails}
                    >
                      <FaPrint aria-hidden="true" />
                      <span>{t.dailyDetails.detailsPanel.print}</span>
                    </button>
                  }
                >
                  {detailsSheetData ? (
                    <>
                      <div className="harvest-daily-workspace__print-content" ref={detailsPrintRef}>
                        <div className="harvest-daily-workspace__sheet-card">
                          <div className="harvest-daily-workspace__sheet-head">
                            <p>{detailsSheetData.dateGregorian}</p>
                            <p>{detailsSheetData.dateHebrew}</p>
                            <p>
                              <strong>{detailsSheetData.labels.season}:</strong> {detailsSheetData.seasonName}
                            </p>
                            <p>
                              <strong>{detailsSheetData.labels.harvestNumber}:</strong> {detailsSheetData.harvestNumber}
                            </p>
                            <p>
                              <strong>{detailsSheetData.labels.updatedBy}:</strong> {detailsSheetData.updatedByName}
                            </p>
                            <p>
                              <strong>{detailsSheetData.labels.field}:</strong> {detailsSheetData.fieldName}
                            </p>
                          </div>

                          <div className="harvest-daily-workspace__sheet-status">{detailsSheetData.statusLabel}</div>

                          <table className="harvest-daily-workspace__sheet-table">
                            <thead>
                              <tr>
                                <th aria-label={detailsSheetData.values.rowType} />
                                <th>{detailsSheetData.labels.totalHarvested}</th>
                                <th>{detailsSheetData.labels.totalRejected}</th>
                                <th>{detailsSheetData.labels.totalAfterRejected}</th>
                                <th>{detailsSheetData.labels.classifiedTotal}</th>
                                <th>{detailsSheetData.labels.rejectionRate}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {detailsSheetData.rows.map((row) => (
                                <tr key={row.key} className={row.kind === 'summary' ? 'harvest-daily-workspace__sheet-row--summary' : undefined}>
                                  <td>{row.label}</td>
                                  <td>{row.totalHarvested}</td>
                                  <td>{row.totalRejected}</td>
                                  <td>{row.totalAfterRejected}</td>
                                  <td>{row.classifiedTotal}</td>
                                  <td>{row.rejectionRate}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>

                          {detailsSheetData.notes ? (
                            <p className="harvest-daily-workspace__sheet-note">
                              <strong>{detailsSheetData.labels.notes}:</strong> {detailsSheetData.notes}
                            </p>
                          ) : null}
                        </div>

                        <div className="harvest-daily-workspace__related-sortings-card">
                        <h4 className="harvest-daily-workspace__related-sortings-title">{relatedSortingsLabels.title}</h4>

                        {isRelatedSortingsLoading ? (
                          <p className="harvest-daily-workspace__related-sortings-state">{relatedSortingsLabels.loading}</p>
                        ) : relatedSortingsLoadError ? (
                          <p className="harvest-daily-workspace__related-sortings-state is-error">{relatedSortingsLoadError}</p>
                        ) : relatedSortings.length === 0 ? (
                          <p className="harvest-daily-workspace__related-sortings-state">{relatedSortingsLabels.empty}</p>
                        ) : (
                          <div className="harvest-daily-workspace__related-sortings-table-wrap">
                            <table className="harvest-daily-workspace__related-sortings-table">
                              <colgroup>
                                <col className="harvest-daily-workspace__related-sortings-col--assignment-type" />
                                <col className="harvest-daily-workspace__related-sortings-col--target" />
                                <col className="harvest-daily-workspace__related-sortings-col--category" />
                                <col className="harvest-daily-workspace__related-sortings-col--grade" />
                                <col className="harvest-daily-workspace__related-sortings-col--pitam" />
                                <col className="harvest-daily-workspace__related-sortings-col--quantity" />
                                <col className="harvest-daily-workspace__related-sortings-col--updated-by" />
                                <col className="harvest-daily-workspace__related-sortings-col--notes" />
                              </colgroup>
                              <thead>
                                <tr>
                                  <th>{relatedSortingsLabels.columns.assignmentType}</th>
                                  <th>{relatedSortingsLabels.columns.target}</th>
                                  <th>{relatedSortingsLabels.columns.category}</th>
                                  <th>{relatedSortingsLabels.columns.grade}</th>
                                  <th>{relatedSortingsLabels.columns.pitamStatus}</th>
                                  <th>{relatedSortingsLabels.columns.quantity}</th>
                                  <th>{relatedSortingsLabels.columns.updatedBy}</th>
                                  <th>{relatedSortingsLabels.columns.notes}</th>
                                </tr>
                              </thead>
                              <tbody>
                                {sortedRelatedSortings.map((row, rowIndex) => {
                                  const note = getRelatedSortingNote(row);

                                  return (
                                    <tr key={row.id}>
                                      <td>{getRelatedSortingAssignmentLabel(row.assignmentType)}</td>
                                      <td>{getRelatedSortingTarget(row)}</td>
                                      <td>{getRelatedSortingCategory(row)}</td>
                                      <td>{getRelatedSortingGrade(row)}</td>
                                      <td>{formatRelatedSortingText(row.pitamStatus)}</td>
                                      <td>{numberFormatter.format(row.quantity)}</td>
                                      <td>{row.updatedBy?.name ?? detailsSheetData.values.none}</td>
                                      <td>
                                        {note ? (
                                          <span
                                            className={`harvest-daily-workspace__related-sorting-note${rowIndex === 0 ? ' is-first-row' : ''}`}
                                            tabIndex={0}
                                            aria-label={note}
                                          >
                                            <span className="harvest-daily-workspace__related-sorting-note-bubble" aria-hidden="true" />
                                            <span className="harvest-daily-workspace__related-sorting-note-tooltip">{note}</span>
                                          </span>
                                        ) : null}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                        </div>
                      </div>
                    </>
                  ) : (
                    <p className="harvest-daily-workspace__details-empty">{t.dailyDetails.detailsPanel.empty}</p>
                  )}
                </GlobalLeftDetailsPanel>

                {selectedCellsCount > 0 ? (
                  <div className="harvest-daily-workspace__selection-summary" role="status" aria-live="polite">
                    <span>{t.dailyDetails.selection.selectedCells(selectedCellsCount)}</span>
                    <span>{t.dailyDetails.selection.total(formattedSelectedTotal)}</span>
                    <button
                      type="button"
                      className="harvest-daily-workspace__selection-clear"
                      onClick={() => setSelectedNumericCells({})}
                    >
                      {t.dailyDetails.selection.clear}
                    </button>
                  </div>
                ) : null}
              </>
            ) : null}
          </div>
        </section>
      ) : (
        <section className="shipments-empty-state">
          <h2 className="shipments-empty-title">{content.title}</h2>
          <p className="shipments-empty-desc">{content.description}</p>
        </section>
      )}
    </AppShell>
  );
}
