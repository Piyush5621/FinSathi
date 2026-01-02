import ClipLoader from "react-spinners/ClipLoader";

const Loader = () => {
  return (
    <div className="flex items-center justify-center w-full h-full">
      <ClipLoader color="#3b82f6" size={50} />
    </div>
  )
}

export default Loader;
