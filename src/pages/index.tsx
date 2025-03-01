import styles from "@/styles/Home.module.css";
import { MultiGrid } from 'react-virtualized';
import { useEffect, useState, useRef } from "react";
import { DateTime } from 'luxon';
import React from "react";
import { GetServerSideProps, InferGetServerSidePropsType } from 'next';

interface cell {
  data: string;
  selected: boolean;
  isTop: boolean;
  isLeft: boolean;
}

interface Props {
  token: string | null;
}

export const getServerSideProps: GetServerSideProps<Props> = async (context) => {
  console.log("getServerSideProps", context.req.headers.authorization);
  return {
    props: {
      token: context.req.headers.authorization ?? null
    }
  }
}

interface firebaseData {
  documents: firebaseDocument[];
}

interface firebaseDocument {
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
const colors = [
  "#FFFFE0", // Light Yellow
  "#F5FFFA", // Mint Cream
  "#E6E6FA", // Lavender
  "#E0FFFF", // Light Cyan
  "#FFDAB9", // Peach Puff
  "#FAF0E6", // Linen
  "#F0FFF0", // Honeydew
  "#F0F8FF", // Alice Blue
  "#FFF5EE", // Seashell
  "#FFE4E1"  // Misty Rose
];


export default function Home({ token }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const daysInMonth = DateTime.now().daysInMonth;

  const [AChart, setAChart] = useState<Map<number, string>>(new Map<number, string>());
  const [BChart, setBChart] = useState<Map<number, string>>(new Map<number, string>());
  const [CChart, setCChart] = useState<Map<number, string>>(new Map<number, string>());

  const [Adata, setAData] = useState<cell[][]>([]);
  const [Bdata, setBData] = useState<cell[][]>([]);
  const [Cdata, setCData] = useState<cell[][]>([]);

  const [selectedData, setSelectedData] = useState<cell[][]>([]);

  const [loading, setLoading] = useState<boolean>(true);
  const [chart, setChart] = useState<string>("A");
  const [isTokenInValid, setIsTokenInvalid] = useState<boolean>(false);
  const ref = useRef<MultiGrid>(null);

  async function fetchData(dates: DateTime[]) {
    const aChart = new Map<number, string>();
    const bChart = new Map<number, string>();
    const cChart = new Map<number, string>();
    for (const d of dates) {
      const resp = await fetch(`https://firestore.googleapis.com/v1/projects/sikkim-lottery-e2faa/databases/(default)/documents/Sikkim Single/${d.toFormat("yyyy-MM-dd")}/values`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })
      if (resp.status === 401 || resp.status === 403) {
        setIsTokenInvalid(true);
        setLoading(false);
        return;
      }
      const data: firebaseData = await resp.json();

      if (data.documents && data.documents.length > 0) {
        data.documents.forEach((doc) => {
          if (doc.fields.data.arrayValue.values.length > 0) {
            const time = DateTime.fromISO(doc.fields.ts.stringValue).valueOf();
            doc.fields.data.arrayValue.values.forEach((value, idx) => {
              if (idx === 0) {
                aChart.set(time, value.integerValue);
              } else if (idx === 1) {
                bChart.set(time, value.integerValue);
              } else if (idx === 2) {
                cChart.set(time, value.integerValue);
              }
            });
          }
        })
      }
    }
    setAChart(aChart);
    setBChart(bChart);
    setCChart(cChart);
    setLoading(false);
  }

  useEffect(() => {
    const headerRow: cell[] = [{ data: 'Time', selected: false, isTop: true, isLeft: true }];
    const dates: DateTime[] = [];
    for (let i = 0; i < daysInMonth; i++) {
      const d = DateTime.now().minus({ days: i })
      headerRow.push({ data: d.toFormat("dd\nMMM"), selected: false, isTop: true, isLeft: false });
      dates.push(d);
    }
    Adata.push(headerRow);
    Bdata.push(headerRow);
    Cdata.push(headerRow);
    setAData(Adata);
    setBData(Bdata);
    setCData(Cdata);
    fetchData(dates);
  }, []);

  useEffect(() => {
    if (loading)
      return
    if (isTokenInValid) {
      return
    }
    const now = DateTime.now();
    let time = DateTime.now().set({ hour: 8, minute: 30, second: 0, millisecond: 0 });
    while (true) {
      const rowA: cell[] = [{ data: time.toFormat('HH:mm\na'), selected: false, isTop: false, isLeft: true }];
      const rowB: cell[] = [{ data: time.toFormat('HH:mm\na'), selected: false, isTop: false, isLeft: true }];
      const rowC: cell[] = [{ data: time.toFormat('HH:mm\na'), selected: false, isTop: false, isLeft: true }];

      for (let i = 0; i < daysInMonth; i++) {
        time = time.minus({ days: 1 });
        rowA.push({ data: AChart.get(time.valueOf()) ?? "-", selected: false, isTop: false, isLeft: false });
        rowB.push({ data: BChart.get(time.valueOf()) ?? "-", selected: false, isTop: false, isLeft: false });
        rowC.push({ data: CChart.get(time.valueOf()) ?? "-", selected: false, isTop: false, isLeft: false });
      }
      Adata.push(rowA);
      Bdata.push(rowB);
      Cdata.push(rowC);
      if (time.hour === 23) {
        break;
      }
      time = time.plus({ minutes: 15 });
      time = time.set({ year: now.year, month: now.month, day: now.day, second: 0, millisecond: 0 });
    }
    setAData(Adata);
    setBData(Bdata);
    setCData(Cdata);
    setSelectedData(Adata);
  }, [loading]);

  const selectAll = (isChecked: boolean) => {
    const updatedData = [...selectedData];
    for (let i = 1; i < selectedData.length; i++) {
      for (let j = 1; j < selectedData[i].length; j++) {
        if (selectedData[i][j].isTop || selectedData[i][j].isLeft || selectedData[i][j].data === '-') {
          continue;
        }
        updatedData[i][j].selected = isChecked;
      }
    }
    setSelectedData(updatedData);
    ref.current?.forceUpdateGrids();
  }

  const changeChart = (chart: string) => {
    if (chart === 'A') {
      setSelectedData(Adata);
    } else if (chart === 'B') {
      setSelectedData(Bdata);
    } else if (chart === 'C') {
      setSelectedData(Cdata);
    }
    setChart(chart);
    ref.current?.forceUpdateGrids();
  }
  if (isTokenInValid) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontSize: '20px', color: '#333' }}>
        Unauthorized
      </div>
    );
  }
  if (loading || selectedData.length === 0) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontSize: '20px', color: '#333' }}>
        Loading...
      </div>
    );
  }



  return (
    <div className={`${styles.page}`}>
      <main className={styles.main} >
        <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginRight: '16px' }}>
            <select onChange={(e) => changeChart(e.target.value)} value={chart} id="chart-select" style={{ padding: '4px', fontSize: '14px', width: '100px' }}>
              <option value="A">A Chart</option>
              <option value="B">B Chart</option>
              <option value="C">C Chart</option>
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
          ref={ref}
          cellRenderer={({ columnIndex, key, rowIndex, style }) => {
            const cellStyle = { ...style }
            cellStyle.backgroundColor = 'white';
            cellStyle.textAlign = 'center';
            cellStyle.display = 'flex';
            cellStyle.justifyContent = 'center';
            cellStyle.alignItems = 'center';
            cellStyle.border = '1px solid #c8e1ff';
            cellStyle.padding = '2px';

            if (selectedData[rowIndex][columnIndex].isTop) {
              cellStyle.backgroundColor = 'red';
              cellStyle.color = 'white';
            }
            if (selectedData[rowIndex][columnIndex].isLeft) {
              cellStyle.backgroundColor = 'black';
              cellStyle.color = 'white';
            }
            if (selectedData[rowIndex][columnIndex].selected) {
              cellStyle.backgroundColor = colors[(rowIndex + 1) % colors.length];
            }
            return <div key={key} style={cellStyle} onClick={() => {
              if (selectedData[rowIndex][columnIndex].isTop || selectedData[rowIndex][columnIndex].isLeft || selectedData[rowIndex][columnIndex].data === '-') {
                return;
              }
              selectedData[rowIndex][columnIndex].selected = !selectedData[rowIndex][columnIndex].selected;
              setSelectedData([...selectedData]);
              ref.current?.forceUpdateGrids();
            }}>
              {selectedData[rowIndex][columnIndex].data}
            </div>
          }}
          columnCount={daysInMonth + 1}
          fixedColumnCount={1}
          fixedRowCount={1}
          rowCount={selectedData.length}

          columnWidth={60}
          rowHeight={30}
          height={800}
          width={400}

        />
      </main>
    </div >

  );
}

