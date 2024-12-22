import * as UI from '../components/ui'
import { FaDiceD20 } from 'react-icons/fa'
export default function Home() {
  return (
    <>
    <div className="">
      <UI.PageHeader bgColor="none">
        <UI.PageHeaderTextGroup>
          <UI.PageHeaderText>
            <div className="flex items-center gap-2">
              <FaDiceD20 className="w-6 h-6" />
              Welcome to the Miniature Database
            </div>
          </UI.PageHeaderText>
          <UI.PageHeaderSubText>
            This is a database of miniatures for use in roleplaying games.
          </UI.PageHeaderSubText>
        </UI.PageHeaderTextGroup>
      </UI.PageHeader>
    </div>
    </>
  )
}
