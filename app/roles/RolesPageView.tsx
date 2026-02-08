import { PageTitle } from "@/components/page-title";
import { roleDefinitions } from "@/lib/mock-data";

export default function RolesPage() {
  const allPermissions = Array.from(
    new Set(roleDefinitions.flatMap((role) => role.permissions)),
  ).sort();

  return (
    <>
      <PageTitle
        title="การจัดการสิทธิ์ (Role)"
        subtitle="อิง schema `Users`, `Roles`, `UserRoles`, `ApproverDirectory`, `UserPlantAccess`"
      />

      <section className="panel">
        <div
          style={{
            display: "grid",
            gap: 12,
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          }}
        >
          {roleDefinitions.map((role) => (
            <article key={role.code} className="panel" style={{ marginTop: 0 }}>
              <h3>{role.name}</h3>
              <p className="muted" style={{ marginTop: 4 }}>
                {role.code}
              </p>
              <p style={{ marginTop: 8 }}>{role.description}</p>
              <div className="chip-list" style={{ marginTop: 8 }}>
                {role.permissions.map((permission) => (
                  <span className="chip" key={permission}>
                    {permission}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="panel">
        <h3 style={{ marginBottom: 10 }}>Permission Matrix</h3>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Permission</th>
                {roleDefinitions.map((role) => (
                  <th key={role.code}>{role.code}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allPermissions.map((permission) => (
                <tr key={permission}>
                  <td>{permission}</td>
                  {roleDefinitions.map((role) => (
                    <td key={`${permission}-${role.code}`}>
                      {role.permissions.includes(permission) ? "✓" : "-"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
