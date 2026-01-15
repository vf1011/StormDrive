import { useProgress } from "../context/ProgressContext";
import { Check, XCircle, Loader } from "lucide-react";
import "./ProgressPanel.css"; // Add styling

const ProgressPanel = () => {
  const { tasks } = useProgress();

  return (
    <div className="progress-panel">
      <h4>Progress</h4>
      {tasks.map(task => (
        <div className="progress-item" key={task.id}>
          <span>{task.label}</span>
          {task.status === "pending" && <Loader className="spinner" />}
          {task.status === "success" && <Check color="green" />}
          {task.status === "error" && <XCircle color="red" />}
        </div>
      ))}
    </div>
  );
};

export default ProgressPanel;
