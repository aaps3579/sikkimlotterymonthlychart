import styles from "@/styles/Home.module.css";
import { MultiGrid } from 'react-virtualized';
import { useEffect, useState, useRef } from "react";
import { DateTime } from 'luxon';
import React from "react";
import { GetServerSideProps, InferGetServerSidePropsType } from 'next';

interface Cell {
  data: string;
  selected: boolean;
  isTop: boolean;
  isLeft: boolean;
}

interface Props {
  token: string | null;
  cityId: string | null;
  categoryId: string | null;
}

interface FirebaseData {
  documents: FirebaseDocument[];
}

interface FirebaseDocument {
  name: string;
  fields: {
    data: {
      arrayValue: {
        values: {
          integerValue: string;
        }[]
      }
    }
    ts: {
      stringValue: string;
    }
  }
  createTime: string;
  updateTime: string;
}

interface HeadsDocument {
  name: string;
  fields: {
    heads: {
      arrayValue: {
        values: {
          stringValue: string;
        }[]
      }
    }
  }
  createTime: string;
  updateTime: string;
}

const COLORS = [
  "#FFFFE0", "#F5FFFA", "#E6E6FA", "#E0FFFF", "#FFDAB9",
  "#FAF0E6", "#F0FFF0", "#F0F8FF", "#FFF5EE", "#FFE4E1"
];

const BASE_API_URL = 'https://firestore.googleapis.com/v1/projects/sikkim-lottery-e2faa/databases/(default)/documents';

export const getServerSideProps: GetServerSideProps<Props> = async (context) => {
  return {
    props: {
      token: context.req.headers.authorization ?? null,
      cityId: context.req.headers['x-city-id'] as string ?? null,
      categoryId: context.req.headers['x-category-id'] as string ?? null
    }
  }
}

export default function Home({ token, cityId, categoryId }: InferGetServerSidePropsType<typeof getServerSideProps>) {

  const daysInMonth = DateTime.now().daysInMonth;
  // Initialize states
  const [heads, setHeads] = useState<string[]>([]);
  const [chart, setChart] = useState<string>('');
  const [chartData, setChartData] = useState<Record<string, Map<number, string>>>({});
  const [gridData, setGridData] = useState<Record<string, Cell[][]>>({});
  const [selectedData, setSelectedData] = useState<Cell[][]>([]);
  const [loading, setLoading] = useState(true);
  const [isTokenInValid, setIsTokenInvalid] = useState(false);

  const gridRef = useRef<MultiGrid>(null);

  const handleAuthError = () => {
    setIsTokenInvalid(true);
    setLoading(false);
  };

  // Fetch heads first
  async function fetchHeads(): Promise<string[] | void> {
    try {
      const headsResp = await fetch(
        `${BASE_API_URL}/Cities/${cityId}/categories/${categoryId}?mask.fieldPaths=heads`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!headsResp.ok) {
        if (headsResp.status === 401 || headsResp.status === 403) {
          return handleAuthError();
        }
        throw new Error(`Failed to fetch heads: ${headsResp.statusText}`);
      }

      const headsDocument: HeadsDocument = await headsResp.json();
      const fetchedHeads = headsDocument.fields.heads.arrayValue.values.map(v => v.stringValue);
      setHeads(fetchedHeads);
      setChart(fetchedHeads[0]); // Set initial chart
      return fetchedHeads;
    } catch (error) {
      console.error('Error fetching heads:', error);
      setLoading(false);
      return [];
    }

  }

  // Then fetch data and initialize charts
  async function fetchData(dates: DateTime[], fetchedHeads: string[]) {
    try {
      const newChartData: Record<string, Map<number, string>> = {};
      fetchedHeads.forEach(head => {
        newChartData[head] = new Map<number, string>();
      });

      const promises = [];
      for (const date of dates) {
        promises.push(fetch(
          `${BASE_API_URL}/Cities/${cityId}/categories/${categoryId}/data/${date.toFormat("yyyy-MM-dd")}/values`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        ));
      }

      const dataResps = await Promise.all(promises);
      for (const dataResp of dataResps) {
        if (!dataResp.ok) {
          if (dataResp.status === 401 || dataResp.status === 403) {
            return handleAuthError();
          }
          throw new Error(`Failed to fetch data: ${dataResp.statusText}`);
        }

        const data: FirebaseData = await dataResp.json();
        if (data.documents?.length) {
          data.documents.forEach(doc => {
            const values = doc.fields.data.arrayValue.values;
            if (values.length) {
              const time = DateTime.fromISO(doc.fields.ts.stringValue).valueOf();
              values.forEach((value, idx) => {
                if (idx < fetchedHeads.length) {
                  newChartData[fetchedHeads[idx]].set(time, value.integerValue);
                }
              });
            }
          });
        }
      }

      setChartData(newChartData);
      setLoading(false);

    } catch (error) {
      console.error('Error fetching data:', error);
      setLoading(false);
    }
  }

  useEffect(() => {
    const headerRow: Cell[] = [{ data: 'Time', selected: false, isTop: true, isLeft: true }];
    const dates: DateTime[] = [];

    for (let i = 0; i < daysInMonth; i++) {
      const d = DateTime.now().minus({ days: i });
      headerRow.push({ data: d.toFormat("dd\nMMM"), selected: false, isTop: true, isLeft: false });
      dates.push(d);
    }

    // First fetch heads, then fetch data
    fetchHeads().then(fetchedHeads => {
      if (!fetchedHeads) return;
      const initialGridData: Record<string, Cell[][]> = {};
      fetchedHeads.forEach(head => {
        initialGridData[head] = [headerRow];
      });
      setGridData(initialGridData);
      fetchData(dates, fetchedHeads);
    });
  }, []);

  useEffect(() => {
    if (loading || isTokenInValid) return;

    let time = DateTime.now().set({ hour: 8, minute: 30, second: 0, millisecond: 0 });
    const newGridData = { ...gridData };

    while (time.hour <= 23) {
      const timeStr = time.toFormat('HH:mm\na');
      const baseCell = { data: timeStr, selected: false, isTop: false, isLeft: true };

      heads.forEach(head => {
        const row: Cell[] = [{ ...baseCell }];
        const dayTime = time;

        for (let i = 0; i < daysInMonth; i++) {
          // Create a new DateTime for each day at the current time
          const currentDayTime = dayTime.minus({ days: i });
          const timeValue = currentDayTime.valueOf();
          row.push({
            data: chartData[head].get(timeValue) ?? "-",
            selected: false,
            isTop: false,
            isLeft: false
          });
        }

        newGridData[head].push(row);
      });

      // Move to next 15-minute interval
      time = time.plus({ minutes: 15 });

      // Stop if we've passed 23:00
      if (time.hour === 23 && time.minute > 0) {
        break;
      }
    }

    setGridData(newGridData);
    setSelectedData(newGridData[chart]);
  }, [loading]);

  const selectAll = (isChecked: boolean) => {
    setSelectedData(prevData => {
      const newData = [...prevData];
      for (let i = 1; i < newData.length; i++) {
        for (let j = 1; j < newData[i].length; j++) {
          if (!newData[i][j].isTop && !newData[i][j].isLeft && newData[i][j].data !== '-') {
            newData[i][j].selected = isChecked;
          }
        }
      }
      return newData;
    });
    gridRef.current?.forceUpdateGrids();
  };

  const changeChart = (newChart: string) => {
    setSelectedData(gridData[newChart]);
    setChart(newChart);
    gridRef.current?.forceUpdateGrids();
  };

  if (isTokenInValid) {
    return (
      <div className={styles.errorContainer}>
        <div className={styles.errorBox}>
          <h2>Unauthorized Access</h2>
          <p>You do not have permission to view this content. Please check your credentials and try again.</p>
        </div>
      </div>
    );
  }

  if (loading || selectedData.length === 0) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}></div>
        <p>Loading data...</p>
      </div>
    );
  }


  const cellRenderer = ({ columnIndex, key, rowIndex, style }: { columnIndex: number, key: string, rowIndex: number, style: React.CSSProperties }) => {
    const cell = selectedData[rowIndex][columnIndex];
    const cellStyle = {
      ...style,
      backgroundColor: 'white',
      textAlign: 'center',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      border: '1px solid #c8e1ff',
      padding: '2px',
      ...(cell.isTop && { backgroundColor: 'red', color: 'white' }),
      ...(cell.isLeft && { backgroundColor: 'black', color: 'white' }),
      ...(cell.selected && { backgroundColor: COLORS[(rowIndex + 1) % COLORS.length] }),
      ...(!cell.isTop && !cell.isLeft && cell.data !== '-' && { cursor: 'pointer', fontWeight: 'bold' })
    };

    const handleClick = () => {
      if (cell.isTop || cell.isLeft || cell.data === '-') return;

      setSelectedData(prevData => {
        const newData = [...prevData];
        newData[rowIndex][columnIndex].selected = !cell.selected;
        return newData;
      });
      gridRef.current?.forceUpdateGrids();
    };

    return (
      <div key={key} style={cellStyle as React.CSSProperties} onClick={handleClick}>
        {cell.data}
      </div>
    );
  };

  return (
    <div className={`${styles.page}`}>
      <main className={styles.main}>
        <div style={{
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'flex-start',
          alignItems: 'center',
          marginBottom: '16px',
          width: '100%',
          position: 'sticky',
          top: 0,
          backgroundColor: 'white',
          zIndex: 1000,
          padding: '8px 0'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            marginRight: '16px'
          }}>
            <select
              onChange={(e) => changeChart(e.target.value)}
              value={chart}
              id="chart-select"
              style={{
                padding: '8px 12px',
                fontSize: '14px',
                width: '120px',
                borderRadius: '4px',
                border: '1px solid #ddd',
                backgroundColor: '#fff',
                cursor: 'pointer',
                outline: 'none',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                transition: 'all 0.2s ease',
                appearance: 'none',
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24'%3E%3Cpath d='M7 10l5 5 5-5z' fill='%23333'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 8px center'
              }}
            >
              {heads.map((head, index) => (
                <option
                  key={index}
                  value={head}
                  style={{
                    padding: '8px',
                    fontSize: '14px'
                  }}
                >
                  {head} Chart
                </option>
              ))}
            </select>
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: '#f5f5f5',
            padding: '4px 8px',
            borderRadius: '4px',
            border: '1px solid #ddd'
          }}>
            <input
              type="checkbox"
              onChange={(e) => selectAll(e.target.checked)}
              style={{
                marginRight: '8px',
                cursor: 'pointer',
                width: '16px',
                height: '16px'
              }}
            />
            <label style={{
              fontSize: '14px',
              color: '#333',
              userSelect: 'none',
              cursor: 'pointer'
            }}>Select All</label>
          </div>
        </div>

        <MultiGrid
          ref={gridRef}
          cellRenderer={cellRenderer}
          columnCount={daysInMonth + 1}
          fixedColumnCount={1}
          fixedRowCount={1}
          rowCount={selectedData.length}
          columnWidth={60}
          rowHeight={30}
          height={Math.round(window.innerHeight) - 100}
          width={400}
        />
      </main>
    </div>
  );
}
