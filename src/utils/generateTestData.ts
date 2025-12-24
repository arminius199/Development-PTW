export const generateTestData = (count: number = 100) => {
    const companies = ['ABC Corp', 'XYZ Ltd', 'Tech Solutions', 'Builders Inc', 'Energy Co', 'Manufacturing Co'];
    const locations = ['Site A', 'Site B', 'Main Office', 'Remote Site', 'Construction Zone'];
    const types = ['Electrical', 'Mechanical', 'Civil', 'Hot Work', 'Confined Space', 'Height Work'];
    const projects = ['Project Alpha', 'Project Beta', 'Project Gamma', 'Renovation', 'Maintenance'];
    const owners = ['John Doe', 'Jane Smith', 'Bob Johnson', 'Alice Brown', 'Charlie Wilson'];
    const statuses = ['Active', 'Completed', 'In Progress', 'Cancelled', 'On Hold'];
  
    const records = [];
    const today = new Date();
  
    for (let i = 1; i <= count; i++) {
      const randomDaysAgo = Math.floor(Math.random() * 30);
      const date = new Date(today);
      date.setDate(today.getDate() - randomDaysAgo);
  
      records.push({
        id: `test-${i}`,
        number: `PTW-${String(i).padStart(4, '0')}`,
        description: `Test work permit ${i}`,
        company: companies[Math.floor(Math.random() * companies.length)],
        location: locations[Math.floor(Math.random() * locations.length)],
        type: types[Math.floor(Math.random() * types.length)],
        project: projects[Math.floor(Math.random() * projects.length)],
        owner: owners[Math.floor(Math.random() * owners.length)],
        day: date.toISOString().split('T')[0],
        status: statuses[Math.floor(Math.random() * statuses.length)],
        created_at: new Date().toISOString(),
      });
    }
  
    return records;
  };