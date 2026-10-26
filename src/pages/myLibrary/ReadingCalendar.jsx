import { useMemo } from "react";

// 독서 달력: 하루에 읽은 시간만큼 칸 색이 진해진다. (올해 1월 ~ 12월, 한 줄이 한 주, 월요일부터)
// 단계: 10분 / 30분 / 60분 / 90분 이상은 1단계, 그 뒤로는 30분마다 한 단계씩 더 진해진다.
const WEEKDAYS = ["월", "화", "수", "목", "금", "토", "일"];
const WEEKS = 53;
const MAX_LEVEL = 10; // 이보다 진해지지는 않는다
const DAY_MS = 24 * 60 * 60 * 1000;

const levelOf = (minutes) => {
  if (!minutes || minutes < 10) return 0;
  if (minutes < 30) return 1;
  if (minutes < 60) return 2;
  if (minutes < 90) return 3;
  return Math.min(MAX_LEVEL, 4 + Math.floor((minutes - 90) / 30));
};

const colorOf = (level) =>
  level === 0 ? "#fdf1f1" : `hsl(345 52% ${Math.max(40, 90 - (level - 1) * 5.5)}%)`;

const toKey = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

const ReadingCalendar = ({ year, log }) => {
  const { cells, months } = useMemo(() => {
    const jan1 = new Date(year, 0, 1);
    const start = new Date(year, 0, 1 - ((jan1.getDay() + 6) % 7)); // 1월 1일이 든 주의 월요일
    const list = [];
    for (let week = 0; week < WEEKS; week += 1) {
      for (let row = 0; row < 7; row += 1) {
        const date = new Date(start.getTime() + (week * 7 + row) * DAY_MS);
        list.push(date.getFullYear() === year ? date : null); // 올해가 아닌 칸은 비워 둔다
      }
    }
    const monthLabels = Array.from({ length: 12 }, (_, m) => ({
      label: `${m + 1}월`,
      column: Math.floor((new Date(year, m, 1).getTime() - start.getTime()) / DAY_MS / 7) + 1,
    }));
    return { cells: list, months: monthLabels };
  }, [year]);

  return (
    <div className="lib-cal">
      <div className="lib-cal-months">
        {months.map((m) => (
          <span key={m.label} style={{ gridColumn: `${m.column} / span 4` }}>
            {m.label}
          </span>
        ))}
      </div>
      <div className="lib-cal-body">
        <div className="lib-cal-days" aria-hidden="true">
          {WEEKDAYS.map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>
        <div className="lib-cal-grid">
          {cells.map((date, i) => {
            if (!date) return <span key={i} className="lib-cal-cell empty" />;
            const minutes = log[toKey(date)] ?? 0;
            return (
              <span
                key={i}
                className="lib-cal-cell"
                style={{ background: colorOf(levelOf(minutes)) }}
                title={`${date.getMonth() + 1}월 ${date.getDate()}일 · ${minutes}분`}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ReadingCalendar;
