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
        <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3">
          {roleDefinitions.map((role) => (
            <article key={role.code} className="panel !mt-0">
              <h3>{role.name}</h3>
              <p className="muted mt-1">
                {role.code}
              </p>
              <p className="mt-2">{role.description}</p>
              <div className="chip-list mt-2">
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
        <h3 className="mb-2.5">Permission Matrix</h3>
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
