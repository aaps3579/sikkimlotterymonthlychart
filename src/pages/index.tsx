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

  token = 'eyJhbGciOiJSUzI1NiIsImtpZCI6ImE5ZGRjYTc2YzEyMzMyNmI5ZTJlODJkOGFjNDg0MWU1MzMyMmI3NmEiLCJ0eXAiOiJKV1QifQ.eyJwcm92aWRlcl9pZCI6ImFub255bW91cyIsImlzcyI6Imh0dHBzOi8vc2VjdXJldG9rZW4uZ29vZ2xlLmNvbS9zaWtraW0tbG90dGVyeS1lMmZhYSIsImF1ZCI6InNpa2tpbS1sb3R0ZXJ5LWUyZmFhIiwiYXV0aF90aW1lIjoxNzQzODUzMTIxLCJ1c2VyX2lkIjoiUWtKajNGMGRnRFI5NjQ2Y0RWc1hGUWRZYU9CMiIsInN1YiI6IlFrSmozRjBkZ0RSOTY0NmNEVnNYRlFkWWFPQjIiLCJpYXQiOjE3NDM4NzA0MDMsImV4cCI6MTc0Mzg3NDAwMywiZmlyZWJhc2UiOnsiaWRlbnRpdGllcyI6e30sInNpZ25faW5fcHJvdmlkZXIiOiJhbm9ueW1vdXMifX0.UHnNSpFhwP3Rae_kKH5wBEp7y5DTpUe7cKuvpxMbB9QHbPTnuu4XEAHtp1HasuvnOWm7ngEq9ruEPpREab4Jfv_JBWYMZkdeIzKCk4gOgHi6X_LaXUyr3XmGD2gDdt5ssUVm5hki_PD2RRE-nDhhNPVzCwkhwB24F_XlHLnb0PINtsx1zcDe6DpEHkGmrkxjAiL9g0aUTXhWNg-oqFz-olGvCP1fzcSORTOQQenjmmyExFnr1nnT8NvzHKwnHASIu_qSkRjPpAGAcXwX9Fpp1dW1FBhYyELQGLhAzJeXGRkWmCGw5fxrHkWO4tLbA3G7PgpQ2T7K-YOtIGpJF6W1Vw'
  cityId = 'jUGWrf1k6sxcZiBBz8pG'
  categoryId = '6vXHyCHxzbXcf9bJG9fG'

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

  // if (selectedData.length === 0) {
  //   return (
  //     <div className={styles.errorContainer}>
  //       <div className={styles.errorBox}>
  //         <h2>No Data Available</h2>
  //         <p>There is no data to display at this time. Please try again later.</p>
  //       </div>
  //     </div>
  //   );
  // }

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
          <div style={{ display: 'flex', alignItems: 'center', marginRight: '16px' }}>
            <select
              onChange={(e) => changeChart(e.target.value)}
              value={chart}
              id="chart-select"
              style={{ padding: '4px', fontSize: '14px', width: '100px' }}
            >
              {heads.map((head, index) => (
                <option key={index} value={head}>{head} Chart</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <input
              type="checkbox"
              onChange={(e) => selectAll(e.target.checked)}
              style={{ marginRight: '8px' }}
            />
            <label style={{ fontSize: '14px', color: '#333' }}>Select All</label>
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
