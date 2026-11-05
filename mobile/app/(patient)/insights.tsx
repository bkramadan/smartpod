/** The AI engine's view of everything I take: conflicts, best times, food guidance. */
import { api } from '../../src/api';
import { useUser } from '../../src/auth';
import { Card, ErrorText, Loading, Muted, ReportView, Screen, useLoad } from '../../src/ui';

export default function Insights() {
  const user = useUser();
  const report = useLoad(() => api.report(user.id), [user.id]);
  return (
    <Screen onRefresh={report.reload} refreshing={report.loading}>
      <ErrorText message={report.error} />
      {report.loading && !report.data && <Loading />}
      {report.data && (
        <Card>
          <ReportView report={report.data} />
        </Card>
      )}
      <Muted>
        Change your wake, meal and sleep times under Me → Daily routine, and the suggested times follow.
      </Muted>
    </Screen>
  );
}
